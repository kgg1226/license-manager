$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# --- [설정 구간] ---
$PROFILE_NAME = "hyeongunk"
$REGION = "ap-northeast-2"
$S3_BUCKET_PATH = "s3://triplecomma-releases/triplecomma-backoffice"
$ZIP_NAME = "license-manager.zip"
$EC2_ID = "i-0aeda7845a9634718"
$REMOTE_BASE_DIR = "/home/ssm-user/app"
$TARGET_DIR = "license-manager"

# --- [유틸리티 함수] ---
function Log($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }
function Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Red }

function Invoke-OrFail([scriptblock]$Script, [string]$ErrorMessage) {
    & $Script
    if ($LASTEXITCODE -ne 0) { Fail $ErrorMessage; exit 1 }
}

# --- [사전 체크: Git Lock 제거] ---
$lockFile = Join-Path (Get-Location) ".git/index.lock"
if (Test-Path $lockFile) {
    Warn "이전 Git 작업의 Lock 파일이 남아있어 제거를 시도합니다..."
    try { Remove-Item $lockFile -Force -ErrorAction Stop } catch {
        Fail "Lock 파일을 지울 수 없습니다. VS Code 등 다른 Git 사용 프로그램을 종료하세요."
        exit 1
    }
}

# --- [1/2] Git Push 단계 (커밋 후 리베이스) ---
Log "=== [1/2] Git 작업 시작 ==="

$hasChanges = (git status --porcelain)
if (-not [string]::IsNullOrWhiteSpace($hasChanges)) {
    Log "변경사항이 감지되었습니다. 커밋을 진행합니다."
    Invoke-OrFail { git add -A } "git add 실패"
    
    $commitMsg = Read-Host "커밋 메시지 입력 (엔터 시 'deploy')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "deploy" }
    
    Invoke-OrFail { git commit -m $commitMsg } "git commit 실패"
} else {
    Warn "커밋할 변경사항이 없습니다."
}

Log "원격 저장소 동기화 (Rebase)..."
Invoke-OrFail { git fetch origin } "git fetch 실패"
Invoke-OrFail { git pull --rebase origin master } "git pull 실패. 충돌(Conflict)이 발생했다면 수동 해결이 필요합니다."
Invoke-OrFail { git push origin master } "git push 실패"
Success "Git 동기화 완료"

# --- [2/2] S3 업로드 단계 (압축 및 전송) ---
Log "=== [2/2] S3 업로드 준비 ==="
$zipPath = Join-Path $env:TEMP $ZIP_NAME
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# 압축 제외 필터링 로직
$excludeList = @(".git*", "node_modules*", ".next*", ".env*", ".claude*", ".claire*", "*.zip", $TARGET_DIR)
$items = Get-ChildItem -Path . | Where-Object {
    $itemName = $_.Name
    $shouldExclude = $false
    foreach ($pattern in $excludeList) {
        if ($itemName -like $pattern) { $shouldExclude = $true; break }
    }
    -not $shouldExclude
}

if ($null -eq $items -or ($items | Measure-Object).Count -eq 0) {
    Fail "압축할 대상이 없습니다. 현재 경로($pwd)를 확인하세요."
    exit 1
}

Log "압축 대상 목록 확인:"
$items | ForEach-Object { Write-Host " - $($_.Name)" -ForegroundColor Gray }

Log "압축 파일 생성 중..."
# FullName 배열로 전달하여 공백 및 경로 이슈 차단
Compress-Archive -Path ($items.FullName) -DestinationPath $zipPath -Force

Log "S3 업로드 중 ($S3_BUCKET_PATH)..."
Invoke-OrFail { aws s3 cp $zipPath "$S3_BUCKET_PATH/$ZIP_NAME" --profile $PROFILE_NAME --region $REGION } "S3 업로드 실패"

Success "모든 로컬 작업이 완료되었습니다!"

# --- [최종 안내: EC2 배포 명령어] ---
Write-Host ""
Write-Host "================================================================" -ForegroundColor Gray
Write-Host " [EC2 배포 명령어 - 복사하여 사용하세요] " -ForegroundColor Cyan
Write-Host "================================================================"
Write-Host "1. EC2 접속:"
Write-Host "   aws ssm start-session --target $EC2_ID --region $REGION --profile $PROFILE_NAME" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. 배포 및 빌드 실행 (한 줄로 실행):"
Write-Host "   cd $REMOTE_BASE_DIR && aws s3 cp $S3_BUCKET_PATH/$ZIP_NAME . --profile $PROFILE_NAME && rm -rf $TARGET_DIR && mkdir $TARGET_DIR && unzip -q $ZIP_NAME -d $TARGET_DIR && rm $ZIP_NAME && cd $TARGET_DIR && sudo docker build -t license-manager:latest . && sudo docker restart license-app" -ForegroundColor Cyan
Write-Host "================================================================"