#!/bin/sh
set -e

echo "[entrypoint] Prisma db push 실행 중..."
npx prisma db push --skip-generate

echo "[entrypoint] 앱 시작..."
exec npm start
