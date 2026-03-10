# 📍 현재 프로젝트 상태

> 🎯 **Planning Role**이 관리합니다. 다른 모든 Role은 **작업 시작 전 반드시 읽으세요.**
>
> **📚 먼저 읽어야 할 문서**: [`tasks/README.md`](README.md) → [`tasks/VISION.md`](VISION.md) → [`tasks/TICKETS.md`](TICKETS.md)
>
> 최종 업데이트: 2026-03-06 🚀

---

## 브랜치 현황

| 브랜치 | 상태 | 내용 |
|---|---|---|
| `master` | 기준 브랜치 | 현재 최신 코드 (구 claude/* 브랜치들 머지 완료) |
| `role/planning` | 운영 중 | 기획 문서 전담 |
| `role/backend` | 운영 중 | 백엔드 코드 전담 |
| `role/frontend` | 운영 중 | 프론트엔드 코드 전담 |
| `role/devops` | 운영 중 | 배포/인프라 전담 |
| `role/security` | 운영 중 | 보안 문서 전담 |

> ⚠️ 구 `claude/*` 브랜치는 아카이브됨. 신규 작업은 `role/*` 브랜치에서 진행.

---

## master에 반영된 기능 (구현 완료)

### 인증
- 로그인 / 로그아웃 (세션 쿠키 기반)
- 역할 기반 접근 제어 (ADMIN / USER)
- 로그인 브루트포스 방어 (`lib/rate-limit.ts`)

### 라이선스 관리
- 라이선스 CRUD (KEY_BASED / VOLUME / NO_KEY)
- 시트(개별 키) 등록·수정, 중복 검사
- 할당 / 반납 / 삭제
- 라이선스 그룹 (기본 그룹 자동 할당)
- **갱신 상태 관리**: `PUT /api/licenses/[id]/renewal-status`
- **갱신 이력**: `GET /api/licenses/[id]/renewal-history`
- **갱신일 수동 설정**: `PUT /api/licenses/[id]/renewal-date`
- **담당자 관리**: `GET|POST|DELETE /api/licenses/[id]/owners`

### 조직원 관리
- 조직원 CRUD
- **조직 이동**: `PATCH /api/employees/[id]`
- **퇴사 처리**: `POST /api/employees/[id]/offboard` (7일 유예)

### 조직 관리 (OrgUnit)
- `GET|POST /api/org/units` — 트리 조회 / 생성
- `PUT|DELETE /api/org/units/[id]` — 수정 / 삭제
- `GET /api/org/units/[id]/delete-preview` — 삭제 영향 범위 미리보기

### 배치/스케줄러
- `POST /api/cron/offboard` — OFFBOARDING 자동 삭제 (offboardingUntil 경과 시)
- `POST /api/cron/renewal-notify` — 갱신 알림 (D-70/30/15/7, Slack + Email)

### Admin
- `DELETE /api/admin/users/[id]` — 사용자 삭제
- `POST /api/admin/users/[id]/reset-password` — 임시 비밀번호 발급

### 대시보드 / 감사 로그 / CSV 임포트
- 대시보드 차트 (비용 추이, 유형 분포, 누적 성장)
- 감사 로그 조회 `/history`
- CSV 임포트 (라이선스, 조직원, 그룹, 배정)

---

## DB 스키마 (master 기준)

> 구 `claude/backend-development-C6wwi` 브랜치 작업이 master에 반영됨.
> EC2 실제 DB 적용은 사람이 VPN 접속 후 수동 SQL 실행 필요.

| 테이블 | 주요 컬럼 |
|---|---|
| `OrgUnit` | `sortOrder`, `updatedAt` / `UNIQUE(name, companyId)` |
| `Employee` | `orgUnitId`, `status(ACTIVE/OFFBOARDING/DELETED)`, `offboardingUntil` |
| `User` | `mustChangePassword` |
| `License` | `renewalDate`, `renewalDateManual`, `renewalStatus` |
| `LicenseRenewalHistory` | 갱신 상태 변경 이력 |
| `LicenseOwner` | 라이선스 담당자 (userId 또는 orgUnitId) |
| `NotificationLog` | 알림 발송 이력 (SLACK / EMAIL) |
| `AuditLog` | `actorType`, `actorId` 추가 |

---

## 🎯 현재 상태 요약

| Phase | 상태 | 비고 |
|---|---|---|
| **Phase 1** — 라이선스 관리 | ✅ 완료 | |
| **Phase 2** — Supabase + 자산 확장 | ✅ 완료 | `8f0cebc`, `2453e3e`, `11ec94d` |
| **배포 전 마무리** (BE-ORG, FE-001, OPS) | ✅ 완료 | |
| **EC2 배포** | ⏳ 대기 | **사람이 직접 실행** |
| **Phase 3** — 월별 보고서 | 📋 착수 대기 | 배포 완료 후 |

---

## Phase 2 완료 내용 (master 반영됨)

### 인프라 전환
- SQLite → Supabase PostgreSQL 완료
- `lib/prisma.ts`: 표준 PrismaClient (어댑터 제거)
- Supabase 마이그레이션 초기화 완료

### 신규 DB 모델
- `Asset` (type: SOFTWARE/CLOUD/HARDWARE/DOMAIN_SSL/OTHER)
- `AssetType`, `AssetStatus` enum
- 유형별 상세 모델

### 신규 API
- `GET|POST /api/assets`
- `GET|PUT|DELETE /api/assets/[id]`
- `PATCH /api/assets/[id]/status`
- `GET /api/assets/expiring`
- `PUT|DELETE /api/org/companies/[id]` (BE-ORG-001/002)
- `POST /api/cron/renewal-notify` — Asset 만료 알림 통합

### 신규 UI
- `/assets` 목록 / `/assets/new` 등록 / `/assets/[id]` 상세
- `/org` — Company CRUD UI
- `mustChangePassword` 강제 변경 UI (FE-001)

### 보안
- ISMS-P 입력 검증 강화 (전체 API)
- AuditLog 전수 커버리지
- `.dockerignore` 정리

---

## 현재 가장 중요한 다음 작업 — EC2 배포

> `deploy.ps1` 실행 (Windows PowerShell, `hyeongunk` 프로필 필요)

1. [ ] **`deploy.ps1` 실행** → git push + S3 업로드 자동 진행
2. [ ] **EC2 SSM 접속 후 아래 명령 실행**
   ```bash
   cd /home/ssm-user/app
   aws s3 cp s3://triplecomma-releases/triplecomma-backoffice/license-manager.zip .
   sudo rm -rf license-manager
   sudo mkdir -p license-manager && sudo chown -R ssm-user:ssm-user license-manager
   unzip -q license-manager.zip -d license-manager && rm license-manager.zip
   cd license-manager
   sudo docker build -t license-manager:latest .
   sudo docker restart license-app
   ```
3. [ ] **Supabase `DATABASE_URL` EC2 환경변수 설정 확인**
4. [ ] **배포 후 동작 확인** (로그인, 자산 목록, 대시보드)

---

## 배포 후 다음 — Phase 3 착수

> 상세 티켓: `tasks/PHASE3-TICKETS.md`

- BE-030: 월별 보고서 집계 API
- BE-031: Excel 내보내기 (`exceljs`)
- BE-032: PDF 내보내기 (`@react-pdf/renderer`)
- FE-020: `/reports` 보고서 페이지

---

## 📚 문서 가이드

| Role | 참고 문서 |
|---|---|
| **Planning** | `tasks/VISION.md`, `tasks/TICKETS.md` |
| **Backend** | `tasks/TICKETS.md`, `tasks/PHASE3-TICKETS.md`, `tasks/api-spec.md` |
| **Frontend** | `tasks/TICKETS.md`, `tasks/PHASE3-TICKETS.md` |
| **DevOps** | `CLAUDE.md`, `tasks/TICKETS.md` |
| **Security** | `tasks/security/guidelines.md` |

---

## 파일 조회 명령어

```bash
# role 브랜치의 특정 파일 확인
git show role/backend:app/api/org/units/route.ts

# 브랜치 변경 파일 목록
git diff master...role/frontend --stat
```
