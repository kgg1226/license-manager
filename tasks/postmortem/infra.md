# 포스트모템 — 배포 / 인프라

> EC2, 네트워크, 환경변수, 폐쇄망, 볼륨 마운트 등

---

## PM-INF-001: 폐쇄망 환경에서 외부 API 호출 실패

- **상태**: ✅ 인지됨 (제약 사항)
- **날짜**: (최초 발생일)
- **세션**: 백엔드

### 증상
Google API, 외부 CDN 등에 대한 fetch 요청이 타임아웃.

### 원인
배포 환경이 폐쇄망으로 외부 인터넷 접근이 차단됨.

### 해결
외부 API 의존성을 제거하거나 내부 대안으로 대체. 외부 라이브러리는 빌드 시 번들링하여 런타임 CDN 의존성 제거.

### 예방
- **절대 규칙**: 런타임에 외부 URL을 호출하는 코드를 작성하지 말 것
- 새 라이브러리 추가 시 → npm install로 번들에 포함되는지 확인
- 폰트, 아이콘 등도 로컬 파일로 제공

### 관련 파일
- `next.config.js` (이미지 도메인 등)
- `package.json` (의존성)

---

## PM-INF-002: 환경변수 누락으로 인한 런타임 에러

- **상태**: ✅ 해결
- **날짜**: (최초 발생일)
- **세션**: 백엔드

### 증상
컨테이너 시작 후 특정 기능에서 `undefined` 관련 에러.

### 원인
`docker run` 시 `-e` 플래그로 환경변수를 전달하지 않았거나, 변수명 오타.

### 해결
필수 환경변수 목록을 문서화하고 실행 명령어에 모두 포함:
- `DATABASE_URL`, `NODE_ENV`, `SECURE_COOKIE`

### 예방
- 환경변수 추가/변경 시 → `license-manager-deploy` 스킬의 환경변수 섹션도 함께 업데이트
- 컨테이너 시작 후 `docker exec license-app env`로 환경변수 확인

### 관련 파일
- `docker-compose.yml`
- `license-manager-deploy` 스킬

---

## PM-INF-003: prisma.config.ts에서 dotenv 모듈 미발견

- **상태**: ✅ 해결
- **날짜**: 2026-03-10
- **세션**: DevOps

### 증상
Docker 컨테이너 기동 후 Prisma CLI 실행 시 실패:
```
Failed to load config file "/app/prisma.config.ts"
Cannot find module 'dotenv'
Require stack: - /app/prisma.config.ts
```

### 원인
- `prisma.config.ts`가 `dotenv`를 import하여 `.env` 파일을 수동 로딩
- Docker 이미지 빌드 시 `npm prune --omit=dev`로 devDependency 제거
- `dotenv`가 devDependency이므로 프로덕션 이미지에 미포함

### 해결
`prisma.config.ts`에서 dotenv 관련 코드 전체 제거:
```ts
// 제거
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
```
Docker 환경에서는 `docker-compose`의 `environment` 블록이 `process.env`에 직접 주입하므로 dotenv 불필요.

### 예방
- **규칙**: `prisma.config.ts`에 dotenv import 금지
- 로컬 개발 시 Prisma CLI는 `schema.prisma`의 `env()` 함수로 `.env` 자동 로딩
- 프로덕션 환경변수는 무조건 컨테이너 실행 시 주입 방식으로만 처리

### 관련 파일
- `prisma.config.ts`

---

## PM-INF-004: (템플릿)

- **상태**: ✅ 해결 / 🔧 미해결
- **날짜**: YYYY-MM-DD
- **세션**: 기획 / 프론트 / 백엔드

### 증상


### 원인


### 해결


### 예방


### 관련 파일

