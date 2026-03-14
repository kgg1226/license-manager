#!/bin/bash
# deploy-remote.sh — EC2에서 실행되는 배포 스크립트
# 사용법: SSM 세션 접속 후 아래 명령 실행
#   cd /home/ssm-user/app && aws s3 cp s3://<bucket>/deploy-remote.sh . && chmod +x deploy-remote.sh && bash deploy-remote.sh
set -e

DIR="/home/ssm-user/app"
APP="asset-manager"
S3_BUCKET="s3://triplecomma-releases/triplecomma-backoffice"
ZIP_NAME="asset-manager.zip"

# ── 실패 시 자동 롤백 + 정리 ──
rollback() {
    EC=$?
    if [ $EC -ne 0 ]; then
        echo ""; echo "!!! 배포 실패 (exit $EC) — 자동 롤백 시작 !!!"
        cd $DIR
        # 찌꺼기 정리
        sudo rm -rf ${APP}-new ${APP}.zip 2>/dev/null || true
        # backup이 있으면 복원
        if [ -d ${APP}-backup ]; then
            sudo rm -rf $APP
            sudo mv ${APP}-backup $APP
            echo "롤백 완료: backup → $APP"
            # 이전 버전 재시작 시도
            cd $DIR/$APP
            sudo docker-compose up -d 2>/dev/null || true
            echo "이전 버전 재시작 시도 완료"
        fi
        echo "!!! 롤백 종료 !!!"
    fi
}
trap rollback EXIT

echo '=== [1/7] 사전 점검 ==='
if ! sudo docker info > /dev/null 2>&1; then echo 'ABORT: Docker 데몬이 실행 중이 아닙니다'; exit 1; fi
echo 'Docker 데몬 OK'

echo '=== [2/7] 디스크 공간 점검 ==='
AVAIL_KB=$(df / --output=avail | tail -1 | tr -d ' ')
AVAIL_MB=$(( AVAIL_KB / 1024 ))
echo "디스크 여유: ${AVAIL_MB}MB"
if [ $AVAIL_KB -lt 2097152 ]; then echo "ABORT: 디스크 여유 부족 (${AVAIL_MB}MB < 2048MB). 배포 중단."; exit 1; fi
echo 'PASS: 디스크 2GB 이상 여유'

echo '=== [3/7] 스왑 점검 ==='
free -h
if [ ! -f /swapfile ]; then
    sudo dd if=/dev/zero of=/swapfile bs=128M count=16 && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '스왑 신규 설정 완료'
else
    echo '스왑 기존 설정 확인됨'
fi

echo '=== [4/7] S3에서 소스코드 다운로드 ==='
cd $DIR
aws s3 cp $S3_BUCKET/$ZIP_NAME .
sudo rm -rf ${APP}-new
sudo mkdir -p ${APP}-new && sudo chown -R ssm-user:ssm-user ${APP}-new
unzip -q $ZIP_NAME -d ${APP}-new && rm $ZIP_NAME
echo 'PASS: 새 소스코드 준비 완료'

echo '=== [5/7] 앱 컨테이너 교체 (DB 유지) ==='
if sudo docker volume ls -q | grep -q postgres_data; then
    echo 'postgres_data 볼륨 존재 확인'
else
    echo '(최초 배포: 볼륨 아직 없음)'
fi

if [ -d $DIR/$APP ]; then
    cd $DIR/$APP
    sudo docker-compose stop app || true
    sudo docker-compose rm -f app || true
    echo 'PASS: 앱 컨테이너 중지됨 (postgres 유지)'
else
    echo '(최초 배포: 기존 앱 없음)'
fi

echo '--- 앱 이미지 정리 (postgres 이미지 보존) ---'
sudo docker images --filter reference='*asset-manager*' -q | xargs -r sudo docker rmi -f 2>/dev/null || true
sudo docker builder prune -f 2>/dev/null || true

cd $DIR
sudo rm -rf ${APP}-backup
if [ -d $APP ]; then sudo mv $APP ${APP}-backup && echo '기존 코드 backup 완료'; fi
sudo mv ${APP}-new $APP
echo 'PASS: 소스코드 교체 완료'

echo '=== [6/7] Docker 빌드 (디스크 재확인) ==='
AVAIL_KB=$(df / --output=avail | tail -1 | tr -d ' ')
AVAIL_MB=$(( AVAIL_KB / 1024 ))
echo "빌드 전 디스크 여유: ${AVAIL_MB}MB"
if [ $AVAIL_KB -lt 1048576 ]; then
    echo "ABORT: 빌드에 필요한 디스크 부족 (${AVAIL_MB}MB < 1024MB). postgres는 계속 실행 중 (DB 안전)."
    exit 1
fi
cd $DIR/$APP
sudo docker build -t asset-manager:latest -f dockerfile .
echo 'PASS: Docker 빌드 성공'

echo '=== [7/7] 앱 시작 + 검증 ==='
sudo docker-compose up -d
sleep 5
sudo docker-compose ps

if sudo docker volume ls -q | grep -q postgres_data; then
    echo 'DB 볼륨 정상'
else
    echo 'WARNING: postgres_data 볼륨 없음'
fi

echo '--- 앱 헬스체크 ---'
for i in 1 2 3 4 5 6; do
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/login || echo '000')
    if [ "$STATUS" = '200' ]; then echo "앱 정상 응답 (HTTP $STATUS)"; break; fi
    echo "[$i/6] 앱 응답 대기... (HTTP $STATUS)"; sleep 5
done

sudo rm -rf $DIR/${APP}-backup 2>/dev/null || true
echo ''
echo '========================================='
echo '  배포 완료!'
echo '========================================='
