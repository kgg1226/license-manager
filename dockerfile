# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder
#   - native 빌드 도구 포함 (better-sqlite3 컴파일)
#   - 모든 의존성 설치 후 Next.js 빌드
#   - 저사양(1 GB RAM) 환경을 위한 메모리 제한·검사 비활성화
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# better-sqlite3 네이티브 애드온 컴파일에 필요
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 의존성 레이어 캐시 분리 (소스 변경 시 재설치 방지)
COPY package*.json ./
RUN npm ci

# 소스 복사 (.dockerignore로 node_modules/.next/generated 등은 제외됨)
COPY . .

# Prisma 클라이언트 생성 (generated/prisma/ 경로)
RUN npx prisma generate

# Next.js 빌드
#   --max-old-space-size=2048 : 가비지 컬렉션 임계값 상향 (OOM 방지)
#   NEXT_DISABLE_TYPECHECK=1  : tsc 검사 스킵 (빌드 메모리·시간 절감)
#   NEXT_DISABLE_ESLINT=1     : eslint 검사 스킵
#   NEXT_TELEMETRY_DISABLED=1 : 텔레메트리 전송 차단
RUN NODE_OPTIONS="--max-old-space-size=2048" \
    NEXT_DISABLE_TYPECHECK=1 \
    NEXT_DISABLE_ESLINT=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    npm run build

# devDependencies 제거 → node_modules 경량화
RUN npm prune --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runner
#   - 빌드 산출물 + 프로덕션 의존성만 복사
#   - 소스 코드·devDeps·빌드 도구 미포함
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# 네이티브 .node 바이너리(better-sqlite3) 실행에 필요한 musl 호환 라이브러리
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# 프로덕션 의존성 (devDeps 제거 후, better-sqlite3 네이티브 바이너리 포함)
COPY --from=builder /app/node_modules ./node_modules

# Next.js 빌드 결과물
COPY --from=builder /app/.next ./.next

# Prisma 생성 클라이언트 (@/generated/prisma 경로로 import됨)
COPY --from=builder /app/generated ./generated

# Prisma 스키마 (런타임 Prisma CLI 미사용 시 불필요하지만 안전을 위해 포함)
COPY --from=builder /app/prisma ./prisma

# 정적 에셋·설정
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# DATABASE_URL 등 필수 환경 변수는 docker-compose 또는 docker run -e 로 주입
CMD ["npm", "start"]
