#!/bin/sh
set -e

# ── [1/3] DB 스키마 동기화 ──────────────────────────────────────────
# prisma db push: 테이블 없으면 생성, 새 필드 추가, 삭제된 필드 제거
# Prisma v7: --skip-generate 플래그 제거됨 (db push가 자동 generate 하지 않음)
echo "[entrypoint] DB 스키마 동기화 중..."

if npx prisma db push 2>&1; then
    echo "[entrypoint] 스키마 동기화 완료"
else
    echo "[entrypoint] 스키마 변경 감지 (필드 삭제 등) — 변경분만 적용 중..."
    npx prisma db push --accept-data-loss
    echo "[entrypoint] 스키마 동기화 완료 (필드 변경 포함)"
fi

# ── [2/3] 초기 데이터 확인 ──────────────────────────────────────────
# User 테이블이 비어있으면 관리자 계정 자동 생성
# 데이터가 이미 있으면 아무것도 하지 않음
echo "[entrypoint] 초기 데이터 확인 중..."
node init-db.mjs || echo "[entrypoint] init-db 스킵 (앱 시작에 영향 없음)"

# ── [3/3] 앱 시작 ──────────────────────────────────────────────────
echo "[entrypoint] 앱 시작..."
exec npm start
