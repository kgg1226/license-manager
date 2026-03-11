$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# --- [설정 구간] ---
$PROFILE_NAME = "hyeongunk"
$REGION = "ap-northeast-2"
$S3_BUCKET = "s3://triplecomma-releases/triplecomma-backoffice"
$ZIP_NAME = "license-manager.zip"
$EC2_ID = "i-0aeda7845a9634718"
$REMOTE_DIR = "/home/ssm-user/app"
$APP_NAME = "license-manager"

# --- [유틸리티 함수] ---
function Log($msg)     { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }
function Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Warn($msg)    { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Yellow }
function Fail($msg)    { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Red }

function Invoke-OrFail([scriptblock]$Script, [string]$ErrorMessage) {
    & $Script
    if ($LASTEXITCODE -ne 0) { Fail $ErrorMessage; exit 1 }
}

# ============================================================
# [1/2] Git Push
# ============================================================
Log "=== [1/2] Git 작업 시작 ==="

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
}
else {
    Warn "커밋할 변경사항 없음."
}

# master 브랜치 확인
$currentBranch = (git branch --show-current)
if ($currentBranch -ne "master") {
    Fail "현재 브랜치가 '$currentBranch'입니다. master 브랜치에서 실행하세요: git checkout master"
    exit 1
}

Invoke-OrFail { git fetch origin } "git fetch 실패"
Invoke-OrFail { git pull origin master } "git pull 실패 (충돌 시 수동 해결 필요)"
Invoke-OrFail { git push origin master } "git push 실패"
Success "Git 동기화 완료"

# ============================================================
# [2/2] S3 업로드 (소스 패키지)
# ============================================================
Log "=== [2/2] S3 업로드 준비 ==="
$zipPath = Join-Path $env:TEMP $ZIP_NAME
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Log "압축 파일 생성 중 (git archive)..."
Invoke-OrFail { git archive --format=zip HEAD -o $zipPath } "git archive 실패"

Log "S3 업로드 중..."
Invoke-OrFail {
    aws s3 cp $zipPath "$S3_BUCKET/$ZIP_NAME" --profile $PROFILE_NAME --region $REGION
} "S3 업로드 실패"

Remove-Item $zipPath -ErrorAction SilentlyContinue
Success "S3 업로드 완료: $S3_BUCKET/$ZIP_NAME"

# ============================================================
# EC2 배포 명령어 안내 (수동 실행)
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " EC2 배포는 수동으로 진행하세요. (docker-compose 방식)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1) SSM 세션 접속 (로컬 PowerShell에서 실행):" -ForegroundColor Yellow
Write-Host "   aws ssm start-session --target $EC2_ID --region $REGION --profile $PROFILE_NAME" -ForegroundColor White
Write-Host ""
Write-Host "2) EC2 접속 후 순서대로 실행:" -ForegroundColor Yellow
Write-Host "   cd $REMOTE_DIR" -ForegroundColor White
Write-Host "   aws s3 cp $S3_BUCKET/$ZIP_NAME ." -ForegroundColor White
Write-Host "   sudo rm -rf $APP_NAME" -ForegroundColor White
Write-Host "   sudo mkdir -p $APP_NAME && sudo chown -R ssm-user:ssm-user $APP_NAME" -ForegroundColor White
Write-Host "   unzip -q $ZIP_NAME -d $APP_NAME && rm $ZIP_NAME" -ForegroundColor White
Write-Host "   cd $APP_NAME" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "   # 기존 컨테이너 정지 + 미사용 이미지·빌드캐시 정리 (볼륨은 유지 — DB 데이터 보존)" -ForegroundColor DarkGray
Write-Host "   sudo docker-compose down" -ForegroundColor White
Write-Host "   sudo docker image prune -a -f" -ForegroundColor White
Write-Host "   sudo docker builder prune -f" -ForegroundColor White
Write-Host "   sudo docker-compose build" -ForegroundColor White
Write-Host "   sudo docker-compose up -d" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "   # 최초 배포 시에만 — DB 초기화" -ForegroundColor DarkGray
Write-Host "   sudo docker exec license-app sh -c 'npx prisma db push'" -ForegroundColor White
Write-Host "   sudo docker exec license-app sh -c 'NODE_ENV=development SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD=changeme123 npx prisma db seed'" -ForegroundColor White
Write-Host ""
Write-Host "3) 배포 확인:" -ForegroundColor Yellow
Write-Host "   sudo docker-compose ps" -ForegroundColor White
Write-Host "   sudo docker-compose logs -f app --tail 30" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
