# License Manager

## 프로젝트 개요
사내 **정보자산 통합 관리** 웹 앱 — 소프트웨어 라이선스·클라우드 구독·하드웨어·도메인 등 회사의 모든 자산을 등록·배정·회수하고, 월별 비용 보고서를 내보낸다.
- 스택: Next.js 15 App Router + Prisma 7 + Supabase(PostgreSQL) + Tailwind CSS 4
- 인증: 자, `prisma.config.ts` | `tasks/`, 페이지 파일 |
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


## 폐쇄망 제약
- 런타임에 외부 URL 호출 금지
- 외부 CDN 의존 금지 (Google Fonts 등 포함)
- 모든 라이브러리는 `npm install`로 번들에 포함

## 빌드 주의사항
- EC2 ARM64, RAM 제한 환경 — 빌드 전 스왑 확인 필수 (`free -h`)
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경은 호스트에서 `sqlite3`로 직접 SQL 실행
- `prisma generate` 결과물은 `generated/prisma/`에 위치 (`lib/prisma.ts`에서 import)
=======
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
