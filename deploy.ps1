$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# --- [설정 구간] ---
$PROFILE_NAME = "hyeongunk"
$REGION       = "ap-northeast-2"
$S3_BUCKET    = "s3://triplecomma-releases/triplecomma-backoffice"
$ZIP_NAME     = "license-manager.zip"
$EC2_ID       = "i-0aeda7845a9634718"
$REMOTE_DIR   = "/home/ssm-user/app"
$APP_NAME     = "license-manager"

# --- [유틸리티 함수] ---
function Log($msg)     { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }
function Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Warn($msg)    { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Yellow }
function Fail($msg)    { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Red }

function Invoke-OrFail([scriptblock]$Script, [string]$ErrorMessage) {
    & $Script
    if ($LASTEXITCODE -ne 0) { Fail $ErrorMessage; exit 1 }
}

# SSM 명령 완료 대기 (최대 $MaxWaitSec 초, $IntervalSec 간격으로 폴링)
function Wait-SSMCommand([string]$CommandId, [int]$MaxWaitSec = 600, [int]$IntervalSec = 15) {
    $elapsed = 0
    while ($elapsed -lt $MaxWaitSec) {
        Start-Sleep -Seconds $IntervalSec
        $elapsed += $IntervalSec

        $status = aws ssm get-command-invocation `
            --command-id $CommandId `
            --instance-id $EC2_ID `
            --query "Status" `
            --output text `
            --profile $PROFILE_NAME `
            --region $REGION 2>$null

        $mins = [math]::Floor($elapsed / 60)
        $secs = $elapsed % 60
        Log "  대기 중... ($($mins)m $($secs)s) 상태: $status"

        if ($status -eq "Success") { return "Success" }
        if ($status -in @("Failed", "TimedOut", "Cancelled", "DeliveryTimedOut")) { return $status }
    }
    return "Timeout"
}

# SSM 실행 결과 출력
function Show-SSMOutput([string]$CommandId) {
    $stdout = aws ssm get-command-invocation `
        --command-id $CommandId `
        --instance-id $EC2_ID `
        --query "StandardOutputContent" `
        --output text `
        --profile $PROFILE_NAME `
        --region $REGION 2>$null

    $stderr = aws ssm get-command-invocation `
        --command-id $CommandId `
        --instance-id $EC2_ID `
        --query "StandardErrorContent" `
        --output text `
        --profile $PROFILE_NAME `
        --region $REGION 2>$null

    if (-not [string]::IsNullOrWhiteSpace($stdout)) {
        Write-Host "--- EC2 출력 ---" -ForegroundColor DarkGray
        Write-Host $stdout -ForegroundColor Gray
    }
    if (-not [string]::IsNullOrWhiteSpace($stderr)) {
        Write-Host "--- EC2 오류 ---" -ForegroundColor DarkRed
        Write-Host $stderr -ForegroundColor Red
    }
}

# ============================================================
# [1/3] Git Push
# ============================================================
Log "=== [1/3] Git 작업 시작 ==="

$lockFile = Join-Path (Get-Location) ".git/index.lock"
if (Test-Path $lockFile) {
    Warn "Git Lock 파일 감지 — 제거 시도..."
    try { Remove-Item $lockFile -Force -ErrorAction Stop }
    catch { Fail "Lock 파일 제거 실패. VS Code 등 다른 Git 프로그램을 종료하세요."; exit 1 }
}

$hasChanges = (git status --porcelain)
if (-not [string]::IsNullOrWhiteSpace($hasChanges)) {
    Log "변경사항 감지. 커밋을 진행합니다."
    Invoke-OrFail { git add -A } "git add 실패"
    $commitMsg = Read-Host "커밋 메시지 입력 (엔터 시 'deploy')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "deploy" }
    Invoke-OrFail { git commit -m $commitMsg } "git commit 실패"
} else {
    Warn "커밋할 변경사항 없음."
}

Invoke-OrFail { git fetch origin } "git fetch 실패"
Invoke-OrFail { git pull --rebase origin master } "git pull 실패 (충돌 시 수동 해결 필요)"
Invoke-OrFail { git push origin master } "git push 실패"
Success "Git 동기화 완료"

# ============================================================
# [2/3] S3 업로드
# ============================================================
Log "=== [2/3] S3 업로드 준비 ==="
$zipPath = Join-Path $env:TEMP $ZIP_NAME
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$excludeList = @(".git*", "node_modules*", ".next*", ".env*", ".claude*", "*.zip")
$items = Get-ChildItem -Path . | Where-Object {
    $name = $_.Name
    $exclude = $false
    foreach ($p in $excludeList) { if ($name -like $p) { $exclude = $true; break } }
    -not $exclude
}

if ($null -eq $items -or ($items | Measure-Object).Count -eq 0) {
    Fail "압축할 대상이 없습니다. 현재 경로($pwd)를 확인하세요."
    exit 1
}

Log "압축 대상:"
$items | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }

Log "압축 파일 생성 중..."
Compress-Archive -Path ($items.FullName) -DestinationPath $zipPath -Force

Log "S3 업로드 중..."
Invoke-OrFail {
    aws s3 cp $zipPath "$S3_BUCKET/$ZIP_NAME" --profile $PROFILE_NAME --region $REGION
} "S3 업로드 실패"
Success "S3 업로드 완료: $S3_BUCKET/$ZIP_NAME"

# ============================================================
# [3/3] EC2 배포 (SSM)
# ============================================================
Log "=== [3/3] EC2 배포 시작 (SSM) ==="

# EC2는 IAM Role로 S3 접근 → --profile 불필요
$commands = @(
    "set -e",
    "echo '=== [1/5] S3에서 소스 다운로드 ==='",
    "cd $REMOTE_DIR",
    "aws s3 cp $S3_BUCKET/$ZIP_NAME .",
    "echo '=== [2/5] 기존 소스 완전 삭제 후 재배치 ==='",
    "sudo rm -rf $APP_NAME",
    "mkdir -p $APP_NAME",
    "unzip -q $ZIP_NAME -d $APP_NAME",
    "rm -f $ZIP_NAME",
    "cd $APP_NAME",
    "echo '=== [3/5] 스왑 확인 ==='",
    "free -h",
    "if [ ! -f /swapfile ]; then sudo dd if=/dev/zero of=/swapfile bs=128M count=16 && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '스왑 설정 완료'; else echo '스왑 이미 존재'; fi",
    "echo '=== [4/5] Docker 이미지 빌드 ==='",
    "sudo docker build -t license-manager:new .",
    "echo '=== [5/5] 컨테이너 교체 ==='",
    "sudo docker tag license-manager:latest license-manager:backup 2>/dev/null || true",
    "sudo docker rm -f license-app || true",
    "sudo docker run -d --name license-app -p 8080:3000 -e DATABASE_URL=file:/app/dev.db -e NODE_ENV=production -e SECURE_COOKIE=false -v /home/ssm-user/license-manager/data/dev.db:/app/dev.db license-manager:new",
    "sudo docker tag license-manager:new license-manager:latest",
    "echo '=== 배포 완료 ==='",
    "sudo docker ps --filter name=license-app --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
)

$parametersJson = @{ commands = $commands } | ConvertTo-Json -Compress

$COMMAND_ID = aws ssm send-command `
    --instance-ids $EC2_ID `
    --document-name "AWS-RunShellScript" `
    --parameters $parametersJson `
    --timeout-seconds 600 `
    --comment "deploy from deploy.ps1" `
    --query "Command.CommandId" `
    --output text `
    --profile $PROFILE_NAME `
    --region $REGION

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($COMMAND_ID)) {
    Fail "SSM 명령 전송 실패"
    exit 1
}
Log "SSM 명령 전송됨 (ID: $COMMAND_ID)"
Log "빌드 완료까지 최대 10분 소요됩니다..."

$result = Wait-SSMCommand -CommandId $COMMAND_ID -MaxWaitSec 600 -IntervalSec 15
Show-SSMOutput -CommandId $COMMAND_ID

if ($result -eq "Success") {
    Success "================================================================"
    Success " 배포 완료!"
    Success "================================================================"
} else {
    Fail "================================================================"
    Fail " 배포 실패 (상태: $result)"
    Fail " 롤백 명령어:"
    Write-Host " aws ssm send-command --instance-ids $EC2_ID --document-name AWS-RunShellScript --parameters '{`"commands`":[`"sudo docker rm -f license-app || true && sudo docker run -d --name license-app -p 8080:3000 -e DATABASE_URL=file:/app/dev.db -e NODE_ENV=production -e SECURE_COOKIE=false -v /home/ssm-user/license-manager/data/dev.db:/app/dev.db license-manager:backup`"]}' --profile $PROFILE_NAME --region $REGION" -ForegroundColor Yellow
    Fail "================================================================"
    exit 1
}
