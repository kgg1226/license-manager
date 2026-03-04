# deploy.ps1
# 사용법: .\deploy.ps1
# 로컬에서 실행하면 git push + EC2 자동 배포 + QA까지 진행

$INSTANCE_ID = "i-0aeda7845a9634718"
$REGION = "ap-northeast-2"
$PROFILE = "hyeongunk"
$S3_PATH = "s3://triplecomma-releases/triplecomma-backoffice"

function Log($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }
function Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Red }

# ─── 1. git push ──────────────────────────────────────────────────
Log "=== [1/4] git push ==="
git add -A
$commitMsg = Read-Host "커밋 메시지 입력 (엔터 시 'deploy' 사용)"
if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "deploy" }
git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Log "변경사항 없음 — 배포만 진행"
}
git push
if ($LASTEXITCODE -ne 0) {
    # non-fast-forward 시 rebase 후 재시도
    Log "rebase 후 재시도..."
    git pull --rebase
    git push
    if ($LASTEXITCODE -ne 0) {
        Fail "git push 실패. 수동으로 해결 후 다시 실행하세요."
        exit 1
    }
}
Success "git push 완료"

# ─── 2. 소스코드 zip → S3 업로드 ──────────────────────────────────
Log "=== [2/4] S3 업로드 ==="
$zipPath = "$env:TEMP\license-manager.zip"

# 기존 zip 삭제
if (Test-Path $zipPath) { Remove-Item $zipPath }

# zip 생성 (node_modules, .next 제외)
$source = Get-Location
$exclude = @(".git", "node_modules", ".next", ".env", ".env.local")
$items = Get-ChildItem -Path $source | Where-Object { $_.Name -notin $exclude }
Compress-Archive -Path $items.FullName -DestinationPath $zipPath -Force

aws s3 cp $zipPath "$S3_PATH/license-manager.zip" `
    --profile $PROFILE --region $REGION

if ($LASTEXITCODE -ne 0) {
    Fail "S3 업로드 실패"
    exit 1
}
Success "S3 업로드 완료"

# ─── 3. EC2 배포 스크립트 S3 업로드 ───────────────────────────────
Log "=== [3/4] EC2 배포 시작 ==="

# 배포 스크립트 생성 후 S3 업로드
$deployScript = @'
#!/bin/bash
set -e
echo "=== [1/4] S3 다운로드 ==="
cd /home/ssm-user/app
aws s3 cp s3://triplecomma-releases/triplecomma-backoffice/license-manager.zip .
unzip -o license-manager.zip -d license-manager
cd license-manager

echo "=== [2/4] 스왑 확인 ==="
if [ ! -f /swapfile ]; then
  sudo dd if=/dev/zero of=/swapfile bs=128M count=16
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo "스왑 설정 완료"
fi
free -h

echo "=== [3/4] Docker 빌드 ==="
sudo docker build -t license-manager:new .

echo "=== [4/4] 컨테이너 교체 ==="
sudo docker tag license-manager:latest license-manager:backup 2>/dev/null || true
sudo docker rm -f license-app || true
sudo docker run -d --name license-app \
  -p 8080:3000 \
  -e DATABASE_URL=file:/app/dev.db \
  -e NODE_ENV=production \
  -e SECURE_COOKIE=false \
  -v /home/ssm-user/license-manager/data/dev.db:/app/dev.db \
  license-manager:new
sudo docker tag license-manager:new license-manager:latest
echo "=== 배포 완료 ==="
'@

$deployScript | Out-File -FilePath "$env:TEMP\deploy.sh" -Encoding utf8 -NoNewline
aws s3 cp "$env:TEMP\deploy.sh" "$S3_PATH/scripts/deploy.sh" `
    --profile $PROFILE --region $REGION

# QA 스크립트 생성 후 S3 업로드
$qaScript = @'
#!/bin/bash
BASE_URL="http://localhost:8080"
FAIL=0
echo "=== QA 시작 ==="

for i in 1 2 3 4 5 6; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/login 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then echo "앱 준비됨"; break; fi
  echo "[$i/6] 대기... ($STATUS)"; sleep 5
done

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/login)
[ "$STATUS" = "200" ] && echo "PASS /login" || { echo "FAIL /login ($STATUS)"; FAIL=1; }

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
[ "$STATUS" = "200" ] && echo "PASS POST /api/auth/login" || { echo "FAIL POST /api/auth/login ($STATUS)"; FAIL=1; }

COOKIE=$(curl -s -i \
  -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -i "set-cookie" | grep "session_token" \
  | sed 's/.*session_token=//;s/;.*//' | tr -d '\r')

for PAGE in / /licenses /employees /settings/import; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Cookie: session_token=$COOKIE" $BASE_URL$PAGE)
  [ "$STATUS" = "200" ] && echo "PASS $PAGE" || { echo "FAIL $PAGE ($STATUS)"; FAIL=1; }
done

for API in /api/licenses /api/employees; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Cookie: session_token=$COOKIE" $BASE_URL$API)
  [ "$STATUS" = "200" ] && echo "PASS $API" || { echo "FAIL $API ($STATUS)"; FAIL=1; }
done

echo "=== QA 완료 ==="
[ "$FAIL" = "0" ] && echo "QA_RESULT=PASS" || { echo "QA_RESULT=FAIL"; exit 1; }
'@

$qaScript | Out-File -FilePath "$env:TEMP\qa.sh" -Encoding utf8 -NoNewline
aws s3 cp "$env:TEMP\qa.sh" "$S3_PATH/scripts/qa.sh" `
    --profile $PROFILE --region $REGION

# 롤백 스크립트
$rollbackScript = @'
#!/bin/bash
echo "=== 롤백 시작 ==="
if sudo docker images | grep -q "license-manager.*backup"; then
  sudo docker rm -f license-app || true
  sudo docker run -d --name license-app \
    -p 8080:3000 \
    -e DATABASE_URL=file:/app/dev.db \
    -e NODE_ENV=production \
    -e SECURE_COOKIE=false \
    -v /home/ssm-user/license-manager/data/dev.db:/app/dev.db \
    license-manager:backup
  echo "=== 롤백 완료 ==="
else
  echo "백업 이미지 없음 — 롤백 불가"
fi
'@

$rollbackScript | Out-File -FilePath "$env:TEMP\rollback.sh" -Encoding utf8 -NoNewline
aws s3 cp "$env:TEMP\rollback.sh" "$S3_PATH/scripts/rollback.sh" `
    --profile $PROFILE --region $REGION

# EC2에서 배포 실행
$COMMAND_ID = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[`"aws s3 cp $S3_PATH/scripts/deploy.sh /tmp/deploy.sh && chmod +x /tmp/deploy.sh && bash /tmp/deploy.sh`"]" `
    --timeout-seconds 600 `
    --region $REGION `
    --profile $PROFILE `
    --query "Command.CommandId" `
    --output text

if ($LASTEXITCODE -ne 0) {
    Fail "SSM 명령 전송 실패"
    exit 1
}

Log "배포 명령 전송됨 (ID: $COMMAND_ID)"
Log "배포 완료 대기 중... (최대 10분)"

# 배포 완료 대기
for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 15
    $STATUS = aws ssm get-command-invocation `
        --command-id $COMMAND_ID `
        --instance-id $INSTANCE_ID `
        --region $REGION `
        --profile $PROFILE `
        --query "Status" `
        --output text 2>$null

    Log "[$i/40] 배포 상태: $STATUS"

    if ($STATUS -eq "Success") {
        Success "배포 성공"
        break
    } elseif ($STATUS -in @("Failed", "TimedOut", "Cancelled")) {
        # 실패 로그 출력
        aws ssm get-command-invocation `
            --command-id $COMMAND_ID `
            --instance-id $INSTANCE_ID `
            --region $REGION `
            --profile $PROFILE `
            --query "StandardOutputContent" `
            --output text
        Fail "배포 실패: $STATUS — 롤백 시도 중..."

        # 롤백
        aws ssm send-command `
            --instance-ids $INSTANCE_ID `
            --document-name "AWS-RunShellScript" `
            --parameters "commands=[`"aws s3 cp $S3_PATH/scripts/rollback.sh /tmp/rollback.sh && chmod +x /tmp/rollback.sh && bash /tmp/rollback.sh`"]" `
            --timeout-seconds 120 `
            --region $REGION `
            --profile $PROFILE | Out-Null

        exit 1
    }
}

# ─── 4. QA 실행 ────────────────────────────────────────────────────
Log "=== [4/4] QA 실행 ==="

$QA_ID = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[`"aws s3 cp $S3_PATH/scripts/qa.sh /tmp/qa.sh && chmod +x /tmp/qa.sh && bash /tmp/qa.sh`"]" `
    --timeout-seconds 120 `
    --region $REGION `
    --profile $PROFILE `
    --query "Command.CommandId" `
    --output text

for ($i = 1; $i -le 12; $i++) {
    Start-Sleep -Seconds 10
    $STATUS = aws ssm get-command-invocation `
        --command-id $QA_ID `
        --instance-id $INSTANCE_ID `
        --region $REGION `
        --profile $PROFILE `
        --query "Status" `
        --output text 2>$null

    Log "[$i/12] QA 상태: $STATUS"

    if ($STATUS -eq "Success") {
        $OUTPUT = aws ssm get-command-invocation `
            --command-id $QA_ID `
            --instance-id $INSTANCE_ID `
            --region $REGION `
            --profile $PROFILE `
            --query "StandardOutputContent" `
            --output text
        Write-Host $OUTPUT
        Success "=== 전체 배포 완료 ==="
        exit 0
    } elseif ($STATUS -eq "Failed") {
        $OUTPUT = aws ssm get-command-invocation `
            --command-id $QA_ID `
            --instance-id $INSTANCE_ID `
            --region $REGION `
            --profile $PROFILE `
            --query "StandardOutputContent" `
            --output text
        Write-Host $OUTPUT
        Fail "QA 실패 — 롤백 시도 중..."

        aws ssm send-command `
            --instance-ids $INSTANCE_ID `
            --document-name "AWS-RunShellScript" `
            --parameters "commands=[`"aws s3 cp $S3_PATH/scripts/rollback.sh /tmp/rollback.sh && chmod +x /tmp/rollback.sh && bash /tmp/rollback.sh`"]" `
            --timeout-seconds 120 `
            --region $REGION `
            --profile $PROFILE | Out-Null

        exit 1
    }
}

Fail "QA 타임아웃"
exit 1
