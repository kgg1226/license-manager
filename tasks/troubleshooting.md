# 🔧 트러블슈팅 가이드

> Asset Manager 배포 과정에서 발생한 에러 및 해결 명령어 정리
> 최종 업데이트: 2026-03-10

---

## 1️⃣ Git Rebase 충돌 해결

**증상:** `git pull` 시 merge conflict 발생

```bash
# 현재 상태 확인
git status

# 충돌 파일 목록 확인
git diff --name-only --diff-filter=U

# 방법 A: 현재 브랜치의 변경 유지
git checkout --ours <파일>
git add <파일>
git rebase --continue

# 방법 B: 원격 브랜치의 변경 유지
git checkout --theirs <파일>
git add <파일>
git rebase --continue

# 반복해서 모든 충돌 해결 후
git rebase --continue

# 최종 푸시
git push origin master
```

---

## 2️⃣ Node.js / npm 설치 문제

**증상:** `npx: command not found`

```bash
# nvm 설치 (처음 한 번만)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# bashrc 재로드
source ~/.bashrc

# Node.js 설치
nvm install 20
nvm use 20

# 확인
node --version
npm --version
npx --version
```

---

## 3️⃣ Docker Compose 실행

**증상:** 컨테이너가 실행되지 않거나 네트워크 연결 실패

```bash
# 기존 컨테이너 정리
sudo docker-compose down -v  # 볼륨도 제거하려면 -v 추가

# 최신 코드 받기
git pull origin master

# 새로 빌드·시작
sudo docker-compose up -d

# 상태 확인
sudo docker-compose ps

# 로그 확인
sudo docker-compose logs -f license-app

# 특정 서비스만 재시작
sudo docker-compose restart license-app
sudo docker-compose restart postgres
```

---

## 4️⃣ PostgreSQL 연결 문제

**증상:** `Can't reach database server at postgres:5432`

### 원인 1: Docker 네트워크 미설정
```bash
# 네트워크 생성
docker network create license-network

# 기존 컨테이너를 네트워크에 연결
docker network connect license-network postgres
docker network connect license-network license-app
```

### 원인 2: DATABASE_URL 형식 오류
```bash
# .env 파일 확인 (따옴표 없어야 함)
cat /home/ssm-user/app/asset-manager/.env

# 올바른 형식
DATABASE_URL=postgresql://asset_manager:asset_manager_pass@postgres:5432/asset_manager

# ❌ 틀린 형식
DATABASE_URL="postgresql://..."  # 따옴표 포함 금지
```

### 원인 3: PostgreSQL 컨테이너 미실행
```bash
# PostgreSQL 컨테이너 상태 확인
sudo docker ps | grep postgres

# PostgreSQL 컨테이너 로그
sudo docker logs postgres

# PostgreSQL 수동 시작
sudo docker run -d \
  --name postgres \
  -e POSTGRES_USER=asset_manager \
  -e POSTGRES_PASSWORD=asset_manager_pass \
  -e POSTGRES_DB=asset_manager \
  -p 5432:5432 \
  --restart unless-stopped \
  postgres:16-alpine
```

---

## 5️⃣ Prisma 초기화 실패

**증상:** `PrismaClientInitializationError`, `DATABASE_URL validation failed`

```bash
# 환경 변수 다시 로드
export DATABASE_URL=postgresql://asset_manager:asset_manager_pass@postgres:5432/asset_manager

# Prisma 클라이언트 재생성
npx prisma generate

# 스키마 동기화
npx prisma db push

# Seed 실행
NODE_ENV=development npx prisma db seed
```

---

## 6️⃣ 로그인 500 에러

**증상:** `POST /api/auth/login` → 500 Internal Server Error

```bash
# 1. 앱 로그 확인
sudo docker logs license-app

# 2. PostgreSQL 연결 테스트 (컨테이너 내부)
sudo docker exec license-app psql -h postgres -U asset_manager -d asset_manager -c "SELECT 1;"

# 3. 컨테이너 환경 변수 확인
sudo docker exec license-app env | grep DATABASE_URL

# 4. 앱 재시작
sudo docker-compose restart license-app
```

---

## 7️⃣ 컨테이너 포트 충돌

**증상:** `Error response from daemon: Conflict. The port is already allocated`

```bash
# 점유 중인 포트 확인
sudo netstat -tuln | grep 8080
# 또는
sudo lsof -i :8080

# 기존 프로세스 종료
sudo kill -9 <PID>

# 또는 컨테이너 정리
sudo docker stop license-app
sudo docker rm license-app
```

---

## 8️⃣ npm install 의존성 문제

**증상:** `npm ERR! code ERESOLVE`, `peer dependencies conflict`

```bash
# 캐시 제거
npm cache clean --force

# 재설치
rm -rf node_modules package-lock.json
npm install

# 또는 강제 설치
npm install --legacy-peer-deps
```

---

## 9️⃣ Prisma 데이터베이스 초기화

**증상:** 스키마 푸시 후에도 테이블이 없거나 데이터가 없음

```bash
# 현재 스키마 상태 확인
npx prisma db execute --stdin < prisma/schema.prisma

# DB 완전 리셋 (주의: 데이터 삭제됨)
npx prisma db push --force-reset

# 또는 PostgreSQL 직접 접근
PGPASSWORD=asset_manager_pass psql \
  -h localhost \
  -U asset_manager \
  -d asset_manager

# 테이블 목록 확인
\dt

# 특정 테이블 삭제
DROP TABLE "User" CASCADE;

# 스키마 다시 푸시
npx prisma db push
```

---

## 🔟 EC2 SSM 접속

**증상:** EC2에 SSH로 직접 접속 불가 (폐쇄망)

```bash
# AWS 프로필 설정 확인 (~/.aws/credentials)
cat ~/.aws/credentials

# SSM으로 접속
aws ssm start-session \
  --target i-03b9c1979ef4a2142 \
  --region ap-northeast-2 \
  --profile hyeongunk

# 또는 간단히
aws ssm start-session --target i-03b9c1979ef4a2142
```

---

## 1️⃣1️⃣ Docker 이미지 빌드 실패

**증상:** `npm run build` 실패, OOM (Out of Memory)

```bash
# 호스트 메모리 확인
free -h

# 스왑 메모리 확인
swapon -s

# 스왑 추가 (필요시)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 캐시 없이 새로 빌드
sudo docker build --no-cache -t asset-manager:latest .

# 또는 compose로 빌드
sudo docker-compose build --no-cache
```

---

## 1️⃣2️⃣ 데이터 마이그레이션 (Supabase → PostgreSQL)

**증상:** 기존 Supabase 데이터를 EC2 PostgreSQL로 옮겨야 함

```bash
# 1. Supabase에서 덤프 (로컬)
PGPASSWORD=<supabase_password> pg_dump \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -U postgres.<project-ref> \
  -d postgres \
  --no-privileges \
  --no-owner > supabase_backup.sql

# 2. EC2 PostgreSQL로 복원
PGPASSWORD=asset_manager_pass psql \
  -h localhost \
  -U asset_manager \
  -d asset_manager \
  -f supabase_backup.sql

# 3. 시퀀스 재설정 (ID 자동증가 설정)
psql -h localhost -U asset_manager -d asset_manager << EOF
SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX(id) FROM "User"));
SELECT setval(pg_get_serial_sequence('"License"', 'id'), (SELECT MAX(id) FROM "License"));
EOF
```

---

## 1️⃣3️⃣ 자주 사용하는 커맨드 모음

```bash
# ── 상태 확인 ──
sudo docker-compose ps
sudo docker-compose logs -f
sudo docker exec license-app env | grep DATABASE_URL

# ── 데이터베이스 접근 ──
PGPASSWORD=asset_manager_pass psql \
  -h localhost \
  -U asset_manager \
  -d asset_manager

# ── Prisma ──
npx prisma db push          # 스키마 동기화
npx prisma generate         # 클라이언트 재생성
npx prisma studio          # GUI 데이터 보기

# ── 로그 ──
sudo docker-compose logs license-app
sudo docker-compose logs postgres
sudo docker-compose logs -f --tail=100

# ── 재시작 ──
sudo docker-compose restart
sudo docker-compose restart license-app
sudo docker-compose restart postgres

# ── 정리 ──
sudo docker-compose down
sudo docker-compose down -v  # 볼륨 삭제
sudo docker system prune      # 미사용 이미지 정리
```

---

## 📞 에러 보고 시 포함할 정보

새로운 에러 발생 시 다음 정보를 함께 제시하면 빠른 해결 가능:

```bash
# 1. 컨테이너 상태
sudo docker-compose ps

# 2. 해당 컨테이너 로그 (최근 50줄)
sudo docker-compose logs --tail=50

# 3. 환경 변수
sudo docker exec license-app env | grep -i database

# 4. 에러 메시지 전체
# (에러 스크린샷 또는 로그 파일)
```

