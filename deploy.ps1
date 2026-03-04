$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PROFILE = "hyeongunk"
$REGION = "ap-northeast-2"
$S3_PATH = "s3://triplecomma-releases/triplecomma-backoffice"

function Log($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }
function Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Red }

function Invoke-OrFail([scriptblock]$Script, [string]$ErrorMessage) {
    & $Script
    if ($LASTEXITCODE -ne 0) {
        Fail $ErrorMessage
        exit 1
    }
}

# 1. git push
Log "=== [1/2] git push ==="

# 항상 먼저 원격 변경사항 반영 (push reject 최소화)
Invoke-OrFail { git fetch origin } "git fetch 실패"
Invoke-OrFail { git pull --rebase origin master } "git pull --rebase 실패"

$hasChanges = (git status --porcelain)
if (-not [string]::IsNullOrWhiteSpace($hasChanges)) {
    Invoke-OrFail { git add -A } "git add 실패"

    $commitMsg = Read-Host "커밋 메시지 (엔터 시 'deploy')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "deploy" }

    & git commit -m $commitMsg
    if ($LASTEXITCODE -ne 0) {
        Fail "git commit 실패"
        exit 1
    }
} else {
    Warn "커밋할 변경사항이 없습니다. commit 단계는 건너뜁니다."
}

& git push origin master
if ($LASTEXITCODE -ne 0) {
    Warn "git push 실패, rebase 후 1회 재시도합니다."
    Invoke-OrFail { git pull --rebase origin master } "push 재시도 전 rebase 실패"
    Invoke-OrFail { git push origin master } "git push 재시도 실패"
}

Success "git push 완료"

# 2. S3 업로드
Log "=== [2/2] S3 업로드 ==="
$zipPath = "$env:TEMP\license-manager.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$exclude = @(".git", "node_modules", ".next", ".env", ".env.local", ".claude", ".claire")
$items = Get-ChildItem -Path (Get-Location) | Where-Object { $_.Name -notin $exclude }

if ($items.Count -eq 0) {
    Fail "압축 대상 파일이 없습니다."
    exit 1
}

Compress-Archive -Path $items.FullName -DestinationPath $zipPath -Force

& aws s3 cp $zipPath "$S3_PATH/license-manager.zip" --profile $PROFILE --region $REGION
if ($LASTEXITCODE -ne 0) {
    Fail "S3 업로드 실패"
    exit 1
}

Success "=== 완료 ==="
Write-Host ""
Write-Host "다음 단계 (EC2 수동):" -ForegroundColor Yellow
Write-Host "  aws ssm start-session --target i-0aeda7845a9634718 --region ap-northeast-2 --profile hyeongunk" -ForegroundColor Cyan
Write-Host "  cd /home/ssm-user/app/license-manager" -ForegroundColor Cyan
Write-Host "  aws s3 cp s3://triplecomma-releases/triplecomma-backoffice/license-manager.zip ." -ForegroundColor Cyan
Write-Host "  unzip -o license-manager.zip -d license-manager && cd license-manager" -ForegroundColor Cyan
Write-Host "  sudo docker build -t license-manager:latest . && sudo docker restart license-app" -ForegroundColor Cyan
