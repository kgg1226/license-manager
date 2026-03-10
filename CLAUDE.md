# License Manager

## 프로젝트 개요
사내 **정보자산 통합 관리** 웹 앱 — 소프트웨어 라이선스·클라우드 구독·하드웨어·도메인 등 회사의 모든 자산을 등록·배정·회수하고, 월별 비용 보고서를 내보낸다.
- 스택: Next.js 15 App Router + Prisma 7 + PostgreSQL(자체 호스팅/Docker) + Tailwind CSS 4
- 인증: 자체 구현 (세션 쿠키 + bcryptjs), 역할: ADMIN / USER
- DB: PostgreSQL (Docker 컨테이너 또는 EC2 호스팅), Prisma 클라이언트 출력 경로 → `generated/prisma/`
- 배포: Docker Compose, AWS EC2 (ARM64), 단방향 폐쇄망
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

## 데이터베이스 연결 설정

### Docker Compose 사용 (권장)
```bash
# 로컬 개발 또는 EC2 배포
docker-compose up -d

# PostgreSQL + app이 동시에 시작되고, 자동으로 연결됨
# DATABASE_URL: postgresql://license_manager:license_manager_pass@postgres:5432/license_manager
```

### 환경변수 (DATABASE_URL)
**docker-compose 사용 시:** 자동으로 `postgres` 서비스명으로 연결
```
DATABASE_URL=postgresql://license_manager:license_manager_pass@postgres:5432/license_manager
```

**EC2 호스트에서 직접 실행 시:** 호스트 IP 사용
```
DATABASE_URL=postgresql://license_manager:license_manager_pass@172.17.0.1:5432/license_manager
```

**로컬 localhost 테스트:**
```
DATABASE_URL=postgresql://license_manager:license_manager_pass@localhost:5432/license_manager
```

### Prisma 스키마
- provider: `postgresql` (schema.prisma 라인 11)
- url: `env("DATABASE_URL")` 환경변수에서 자동 읽음
- 마이그레이션: `npx prisma db push`
- Seed: `npx prisma db seed`

## 프로덕션 배포 고려사항
- 배포 환경: AWS EC2 t4g.small (ARM64, vCPU 2, RAM 2GB), ap-northeast-2
- 단방향 폐쇄망 (내부→외부 접근 가능, 외부→내부 접근 불가)
- 배포 방식: `deploy.ps1` 실행 → **[1/2] git push** + **[2/2] S3 업로드**까지 자동, EC2 배포는 출력된 명령어를 수동 실행
  - S3: `s3://triplecomma-releases/triplecomma-backoffice/license-manager.zip`
  - EC2 ID: `i-0aeda7845a9634718` / AWS 프로필: `hyeongunk`
  - EC2 접속: `aws ssm start-session --target i-0aeda7845a9634718 --region ap-northeast-2 --profile hyeongunk`
- 포트: 로컬 dev `3000` / 컨테이너 `3000` / 호스트 `8080`
- ⚠️ `deploy.ps1` 내부에 `git pull --rebase` 포함 → master에 커밋 충돌 있으면 배포 실패. 배포 전 반드시 master 클린 상태 확인
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경: `npx prisma db push` 사용 (PostgreSQL용)
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
  schema.prisma      ← DB 스키마 정의 (PostgreSQL)
  seed.ts
prisma.config.ts     ← Prisma 설정 (루트)
generated/
  prisma/            ← Prisma 클라이언트 (자동 생성, 수정 금지)
dockerfile
docker-compose.yml   ← PostgreSQL + app 정의
deploy.ps1           ← EC2 배포 스크립트 (Windows PowerShell)
.github/
  workflows/         ← CI/CD
tasks/               ← 기획/보안/운영 문서 전체
.env.example         ← 환경변수 템플릿
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

## 폐쇄망 제약
- 런타임에 외부 URL 호출 금지
- 외부 CDN 의존 금지 (Google Fonts 등 포함)
- 모든 라이브러리는 `npm install`로 번들에 포함

## 빌드 주의사항
- EC2 ARM64, RAM 제한 환경 — 빌드 전 스왑 확인 필수 (`free -h`)
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경: `npx prisma db push` 사용
- `prisma generate` 결과물은 `generated/prisma/`에 위치 (`lib/prisma.ts`에서 import)
