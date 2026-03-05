# License Manager

## 프로젝트 개요
사내 소프트웨어 라이선스 관리 웹 앱 (등록·할당·회수·이력 관리).
- 스택: Next.js 15 App Router + Prisma 7 + better-sqlite3 + Tailwind CSS 4
- 인증: 자체 구현 (세션 쿠키 + bcryptjs), 역할: ADMIN / USER
- DB: SQLite (`dev.db`), Prisma 클라이언트 출력 경로 → `generated/prisma/`
- 배포: Docker, AWS EC2 t4g.small (ARM64, vCPU 2, RAM 2GB), S3 → EC2 배포, 폐쇄망
- 포트: 로컬 dev `3000` / 컨테이너 `3000` / 호스트 `80` (docker-compose.yml 기준)

## 폐쇄망 제약
- 런타임에 외부 URL 호출 금지
- 외부 CDN 의존 금지 (Google Fonts 등 포함)
- 모든 라이브러리는 `npm install`로 번들에 포함

## 빌드 주의사항
- EC2 t4g.small (ARM64, RAM 2GB) — 빌드 전 스왑 확인 권장 (`free -h`)
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경은 호스트에서 `sqlite3`로 직접 SQL 실행
- `prisma generate` 결과물은 `generated/prisma/`에 위치 (`lib/prisma.ts`에서 import)
- `prisma.config.ts` — 루트에 위치, Prisma 설정 파일

---

## 세션 역할 체제
이 프로젝트는 5개 역할로 분리 운영된다:
- 🎯 기획: `/planning` 으로 진입
- 🎨 프론트엔드: `/frontend` 으로 진입
- ⚙️ 백엔드: `/backend` 으로 진입
- 🔧 DevOps: `/devops` 으로 진입
- 🔒 보안: `/security` 으로 진입

역할 진입 전에는 코드를 수정하지 않는다.

---

## 브랜치 전략 (충돌 방지)

### 장기 운영 브랜치 구조
```
master             ← 배포 기준. PR 머지만 허용, 직접 커밋 금지
  ├── role/planning   ← 기획 전담
  ├── role/backend    ← 백엔드 전담
  ├── role/frontend   ← 프론트엔드 전담
  ├── role/devops     ← DevOps 전담
  └── role/security   ← 보안 전담
```

### 파일 소유권 (엄격 준수 — 충돌 방지 핵심)

| 역할 | 소유 경로 | 절대 수정 금지 |
|---|---|---|
| **기획** | `tasks/` (security/ 제외), `CLAUDE.md` | 코드 파일 일체 |
| **백엔드** | `app/api/`, `lib/`, `prisma/schema.prisma`, `prisma.config.ts` | `tasks/`, 페이지 파일 |
| **프론트엔드** | `app/` (api/ 제외), `public/` | `tasks/`, `app/api/`, `lib/` |
| **DevOps** | `dockerfile`, `docker-compose*.yml`, `deploy.ps1`, `deploy.sh`, `.github/` | `tasks/`, 코드 파일 |
| **보안** | `tasks/security/` | 그 외 모든 파일 |

> ⚠️ 경계를 넘으면 반드시 머지 충돌 발생. 경계를 넘어야 할 때는 기획에 먼저 알린다.

### 작업 흐름
```
1. 역할 브랜치 체크아웃     git checkout role/<역할>
2. master 최신 동기화       git merge master  ← rebase 절대 금지
3. 담당 파일만 수정·커밋
4. PR 생성                  role/<역할> → master
5. 머지 후 동기화           git merge master (다른 역할 브랜치에서)
```

### 절대 금지
- `git rebase` 사용 금지 (반복 충돌의 원인)
- `master`에 직접 커밋 금지
- 다른 역할 소유 파일 수정 금지

---

## 세션 시작 절차 (필수)
모든 역할 세션은 작업 전 아래 순서를 반드시 따른다.

### 1단계 — 최신 상태 동기화
```bash
git fetch origin
git checkout role/<내역할>
git merge master   # rebase 금지
```

### 2단계 — 필수 문서 확인 (순서대로)
1. `tasks/current-state.md` — **현재 완료 현황, 구현된 API 목록**
2. `tasks/todo.md` — 잔여 작업 목록
3. `tasks/security/guidelines.md` — 보안 규칙
4. 역할별 추가 참조:
   - 프론트엔드: `tasks/api-spec.md` (호출할 API 스펙)
   - 백엔드: `tasks/api-spec.md`, `tasks/db-changes.md`
   - DevOps: `.env.infra` (Git 미추적, 로컬 전용)

### 3단계 — 다른 역할 코드 확인 (필요 시)
```bash
# 백엔드 브랜치의 특정 파일 확인
git show role/backend:app/api/org/units/route.ts

# 프론트엔드 브랜치 변경 파일 목록
git diff master...role/frontend --stat
```

---

## 필수 참조 파일
- **최우선**: `tasks/current-state.md` — 실제 완료 현황
- 작업 전: `tasks/todo.md`, `tasks/lessons.md`
- 코드 작성 전: `tasks/security/guidelines.md`
- 에러 해결 후: `tasks/postmortem/` 해당 카테고리에 기록
- API 구현/호출: `tasks/api-spec.md` 준수
- DB 변경: `tasks/db-changes.md` 참조
- 인프라 접속 정보: `.env.infra` (Git 미추적, 로컬 전용)

---

## 실제 디렉토리 구조
```
app/
  api/               ← API Route (백엔드 전담)
    admin/           ← 사용자 관리 API
    assignments/     ← 할당 API
    auth/            ← 인증 API
    cron/            ← 배치/스케줄러 API
    employees/       ← 구성원 API
    groups/          ← 그룹 API
    history/         ← 감사 로그 API
    licenses/        ← 라이선스 API
    org/             ← 조직 API
    seats/           ← 시트 API
  admin/             ← 사용자 관리 페이지 (프론트엔드 전담)
  dashboard/
  employees/
  history/
  licenses/
  login/
  org/
  settings/
  layout.tsx
  page.tsx           ← / → /licenses 리다이렉트
lib/
  auth.ts            ← 인증 (세션/bcrypt)
  prisma.ts          ← Prisma 클라이언트 singleton
  audit-log.ts       ← 감사 로그 기록
  assignment-actions.ts
  cost-calculator.ts
  csv-import.ts
  license-seats.ts
  notification.ts    ← Slack/Email 발송 (nodemailer)
  rate-limit.ts      ← 로그인 브루트포스 방어
prisma/
  schema.prisma      ← DB 스키마 정의
  seed.ts
prisma.config.ts     ← Prisma 설정 (루트)
generated/
  prisma/            ← Prisma 클라이언트 (자동 생성, 수정 금지)
dockerfile
docker-compose.yml
deploy.ps1           ← EC2 배포 스크립트 (Windows PowerShell)
.github/
  workflows/         ← CI/CD
tasks/               ← 기획/보안/운영 문서 전체
```

## 주요 페이지 경로
| 경로 | 설명 |
|---|---|
| `/` | `/licenses`로 리다이렉트 |
| `/login` | 로그인 |
| `/dashboard` | 대시보드 |
| `/licenses` | 라이선스 목록 |
| `/licenses/new` | 라이선스 등록 |
| `/licenses/[id]` | 라이선스 상세 |
| `/licenses/[id]/edit` | 라이선스 수정 |
| `/employees` | 조직원 목록 |
| `/employees/new` | 조직원 등록 |
| `/employees/[id]` | 조직원 상세 |
| `/settings/groups` | 그룹 목록 |
| `/settings/import` | CSV 가져오기 |
| `/org` | 조직도 |
| `/history` | 감사 로그 |
| `/admin/users` | 사용자 관리 (ADMIN 전용) |
