# License Manager

## 프로젝트 개요
사내 **정보자산 통합 관리** 웹 앱 — 소프트웨어 라이선스·클라우드 구독·하드웨어·도메인 등 회사의 모든 자산을 등록·배정·회수하고, 월별 비용 보고서를 내보낸다.
- 스택: Next.js 15 App Router + Prisma 7 + Supabase(PostgreSQL) + Tailwind CSS 4
- 인증: 자체 구현 (세션 쿠키 + bcryptjs), 역할: ADMIN / USER
- DB: Supabase (PostgreSQL), Prisma 클라이언트 출력 경로 → `generated/prisma/`
- 배포: Docker, AWS EC2 (ARM64), 단방향 폐쇄망
- 포트: 호스트 8080 → 컨테이너 3000

## 세션 역할 체제
이 프로젝트는 5개 역할로 분리 운영된다:
- 🎯 기획: `/planning` 으로 진입
- 🎨 프론트엔드: `/frontend` 으로 진입
- ⚙️ 백엔드: `/backend` 으로 진입
- 🔧 DevOps: `/devops` 으로 진입
- 🔒 보안: `/security` 으로 진입

역할 진입 전에는 코드를 수정하지 않는다.
보안 세션이 `tasks/security/guidelines.md`를 업데이트하면, 다른 역할 세션은 작업 전 반드시 확인한다.

## 필수 참조 파일
- 작업 시작 전: `tasks/todo.md`, `tasks/lessons.md` 확인
- 코드 작성 전: `tasks/security/guidelines.md` 보안 규칙 확인
- 에러 해결 후: `tasks/postmortem/` 해당 카테고리에 기록
- API 구현/호출: `tasks/api-spec.md` 준수
- DB 변경: `tasks/db-changes.md` 참조
- 인프라 접속 정보: `.env.infra` 참조 (Git 미추적, 로컬 전용)

## 프로덕션 배포 고려사항
- 배포 환경: AWS EC2 (ARM64), 단방향 폐쇄망 (내부→외부 접근 가능, 외부→내부 접근 불가)
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경은 호스트에서 `psql` (또는 Supabase SQL Editor)로 직접 실행
- `prisma generate` 결과물은 `generated/prisma/`에 위치 (`lib/prisma.ts`에서 import)

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
