# TODO

> 기획 세션(/planning)에서 관리한다.
> 최종 업데이트: 2026-03-05

---

## 🔴 우선순위 1 — Supabase(PostgreSQL) 전환 (배포 블로커)

> SQLite → Supabase PostgreSQL 전환. 코드 전면 수정 필요.
> **백엔드 + DevOps 동시 진행 가능. 완료 후 deploy.ps1 실행.**

### 백엔드 (`role/backend`)

- [ ] **[BE-010]** `prisma/schema.prisma` — DB 프로바이더 변경
  - `provider = "sqlite"` → `provider = "postgresql"`
  - SQLite에서 String으로 우회했던 enum → PostgreSQL 네이티브 enum으로 변경
    - `MemberStatus`, `RenewalStatus`, `Role`, `LicenseType` 등 `@db.Text` 어노테이션 제거
  - `autoincrement()` → `autoincrement()` 유지 (PostgreSQL SERIAL과 호환됨)
  - 전체 모델 검토 후 PostgreSQL 비호환 요소 제거

- [ ] **[BE-011]** `lib/prisma.ts` — better-sqlite3 어댑터 제거
  - `PrismaBetterSqlite3` import 및 adapter 인스턴스 제거
  - 표준 `new PrismaClient()` 로 교체 (`DATABASE_URL` 환경변수 자동 참조)
  - `file:` prefix 파싱 로직 제거

- [ ] **[BE-012]** `package.json` — SQLite 관련 패키지 제거
  - 제거: `better-sqlite3`, `@prisma/adapter-better-sqlite3`, `@types/better-sqlite3`
  - `npm install` 후 `prisma generate` 재실행

- [ ] **[BE-013]** Supabase 마이그레이션 초기 SQL 생성
  - Supabase Dashboard → SQL Editor에서 아래 순서로 실행:
    1. `prisma migrate dev --name init` (로컬 Supabase CLI 연결 시)
    또는 `prisma db push` (스키마 직접 푸시)
  - `tasks/db-changes.md`의 `[2026-03-04]` 항목은 **더 이상 필요 없음** (스키마 전체 새로 생성)
  - 마이그레이션 완료 후 `tasks/db-changes.md` 아카이브 처리

- [x] **[BE-001]** `PATCH /api/employees/[id]` — 조직 이동 시 AuditLog 기록 ✅ 이미 구현됨
- [x] **[BE-002]** `DELETE /api/admin/users/[id]` — 자신의 계정 삭제 방지 ✅ 이미 구현됨
- [x] **[BE-003]** 에러 응답 안전성 확인 ✅ 수정 완료 (30개 라우트 전수 검사, 1건 수정)

### DevOps (`role/devops`)

- [ ] **[OPS-010]** `deploy.sh` / `docker-compose.yml` — SQLite 볼륨 제거
  - 제거: `-v /home/ssm-user/license-manager/data/dev.db:/app/dev.db`
  - 제거: `DATABASE_URL=file:/app/dev.db`
  - 추가: `DATABASE_URL` 환경변수를 EC2 SSM Parameter Store 또는 `.env` 파일로 주입
    - 권장: SSM Parameter Store에 `DATABASE_URL` 저장 → deploy.sh에서 읽어서 `docker run -e` 전달

- [ ] **[OPS-011]** `.env.example` 생성 (실제 값 없이 키 목록만)
  ```
  DATABASE_URL=postgresql://...
  CRON_SECRET=
  SLACK_WEBHOOK_URL=
  SMTP_HOST=
  SMTP_PORT=
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM=
  SMTP_SECURE=false
  SECURE_COOKIE=true
  ```

- [ ] **[OPS-001]** `dockerfile` — 비root USER 지시문 추가
- [ ] **[OPS-002]** `.dockerignore` 점검 (`.env`, `dev.db*`, `*.zip`, `.git` 제외)

---

## 🟡 우선순위 2 — 배포 전 마무리

### 프론트엔드 (`role/frontend`)

- [ ] **[FE-001]** `mustChangePassword` 강제 비밀번호 변경 UI
  - 로그인 후 플래그 `true` 시 비밀번호 변경 페이지로 강제 리다이렉트
  - 변경 완료 시 `PUT /api/admin/users/[id]` 로 플래그 해제

---

## 🔵 우선순위 3 — 배포 후 (사람이 직접)

1. [ ] Supabase Dashboard에서 마이그레이션 확인 (테이블 생성 완료 여부)
2. [ ] `deploy.ps1` 실행
   - 내부 순서: git push → S3 업로드 → SSM으로 EC2 빌드·배포
3. [ ] 배포 후 동작 확인
   - 로그인 / 라이선스 목록 / 대시보드 접근
   - cron 수동 호출 (`POST /api/cron/renewal-notify` with `CRON_SECRET`)

---

## #백엔드 제안 (role/backend 코드 점검 결과)

> 2026-03-05 백엔드 세션에서 전체 API 라우트 점검 후 제안.
> 기획 세션에서 우선순위 판단 후 티켓화 요청.

### P1 — 감사 로그 누락 (ISMS-P 2.11 컴플라이언스)

> 30개 데이터 변경 API 중 7개만 AuditLog 기록. 23개 누락.

- [ ] **[BE-P1-01]** 라이선스 CRUD AuditLog 추가
  - `POST /api/licenses` (생성), `PUT /api/licenses/[id]` (수정), `DELETE /api/licenses/[id]` (삭제)
- [ ] **[BE-P1-02]** 조직원 생성·수정·삭제 AuditLog 추가
  - `POST /api/employees`, `PUT /api/employees/[id]`, `DELETE /api/employees/[id]`
- [ ] **[BE-P1-03]** 사용자 관리 AuditLog 추가
  - `POST /api/admin/users` (생성), `PUT /api/admin/users/[id]` (역할/상태 변경), `DELETE /api/admin/users/[id]` (삭제)
- [ ] **[BE-P1-04]** 그룹·할당·담당자·조직 변경 AuditLog 추가
  - 그룹 CRUD, 그룹 멤버 추가/제거, 할당 반납/삭제, 담당자 추가/제거, OrgUnit 생성/수정

### P2 — 입력 검증 강화 (ISMS-P 2.8)

- [ ] **[BE-P2-01]** 문자열 길이 제한 추가
  - 이름/부서명/설명 등 상한 미설정 → `name ≤ 200`, `description ≤ 2000` 등
- [ ] **[BE-P2-02]** 숫자 범위 검증 추가
  - `totalQuantity > 0`, `price ≥ 0`, `exchangeRate > 0`, `noticePeriodDays ≥ 0`
  - 현재 음수·0 입력 시 에러 없이 저장됨
- [ ] **[BE-P2-03]** 날짜 검증 추가
  - `new Date("invalid")` → Invalid Date가 DB에 저장되는 문제
  - `expiryDate ≥ purchaseDate` 순서 검증
- [ ] **[BE-P2-04]** enum 유효성 — silent default 제거
  - `POST /api/licenses`에서 잘못된 `licenseType` 입력 시 `KEY_BASED`로 기본값 대신 400 에러 반환

### P3 — 성능 개선

- [ ] **[BE-P3-01]** 신규 조직원 자동 할당 N+1 쿼리 개선
  - `POST /api/employees` — 기본 그룹 라이선스 할당 루프 내 개별 count 쿼리 → 배치 로딩
  - 기본 그룹에 라이선스 50개 있으면 150+ 쿼리 발생
- [ ] **[BE-P3-02]** OrgUnit 삭제 시 재귀 쿼리 개선
  - `collectDescendantIds()` — depth별 개별 쿼리 → 한번에 전체 트리 로딩
- [ ] **[BE-P3-03]** 목록 API 페이지네이션 추가 (현재 /history만 지원)
  - `GET /api/licenses`, `GET /api/assignments`, `GET /api/groups`

### P4 — 코드 일관성

- [ ] **[BE-P4-01]** FK 존재 검증 추가
  - `POST /api/org/units` — parentId/companyId 미검증 → Prisma FK 에러 시 500 반환
  - `POST /api/licenses/[id]/owners` — userId/orgUnitId 존재 미검증
- [ ] **[BE-P4-02]** 에러 응답 패턴 통일
  - unique 제약 위반: 일부 라우트만 409 반환, 나머지는 500
  - 유효성 검증 실패: 400 vs silent default 혼재

---

## 🟢 Phase 2 — 자산 유형 확장 (Supabase 전환 후 착수)

> 스펙: `tasks/features/asset-management.md`

### 백엔드 (`role/backend`)
- [ ] **[BE-020]** `prisma/schema.prisma` — `Asset`, `HardwareDetail`, `CloudDetail` 모델 추가
- [ ] **[BE-021]** `GET|POST /api/assets` — 자산 목록 조회·등록
- [ ] **[BE-022]** `GET|PUT|DELETE /api/assets/[id]` — 자산 상세·수정·삭제
- [ ] **[BE-023]** `PATCH /api/assets/[id]/status` — 자산 상태 변경 (INACTIVE / DISPOSED)
- [ ] **[BE-024]** `GET /api/assets/expiring` — 만료 임박 자산 목록
- [ ] **[BE-025]** `POST /api/cron/renewal-notify` — Asset 만료 알림 통합 (expiryDate 기준)

### 프론트엔드 (`role/frontend`)
- [ ] **[FE-010]** `/assets` — 자산 목록 페이지 (탭: 전체·소프트웨어·클라우드·하드웨어·도메인)
- [ ] **[FE-011]** `/assets/new` — 자산 등록 폼 (유형별 추가 필드 동적 표시)
- [ ] **[FE-012]** `/assets/[id]` — 자산 상세 페이지

---

## 대기

### DB 마이그레이션
> `tasks/db-changes.md` [2026-03-04] 항목 참조
> Prisma 스키마 반영 완료. 실DB(SQLite)에 ALTER TABLE 실행은 배포 시 수행.
- [x] OrgUnit: `sortOrder`, `updatedAt` 추가 + unique 제약 변경 (schema 반영)
- [x] Employee: `orgUnitId`, `status`, `offboardingUntil` 추가 (schema 반영)
- [x] User: `mustChangePassword` 추가 (schema 반영)
- [x] License: `renewalDate`, `renewalDateManual`, `renewalStatus` 추가 (schema 반영)
- [x] 신규 테이블: `LicenseRenewalHistory`, `LicenseOwner`, `NotificationLog` (schema 반영)
- [x] AuditLog: `actorType`, `actorId` 컬럼 추가 (schema 반영)
- [x] `prisma generate` 실행
- [ ] 실DB에 ALTER TABLE / CREATE TABLE SQL 실행 (배포 시, `tasks/db-changes.md` 참조)

### 백엔드 — 신규 API 구현
> `tasks/api-spec.md` 참조. 전체 API 구현 완료 (2026-03-06 확인).
- [x] OrgUnit CRUD: `GET /api/org/units`, `POST`, `PUT /[id]`, `DELETE /[id]`
- [x] OrgUnit 삭제 프리뷰: `GET /api/org/units/[id]/delete-preview`
- [x] 구성원 조직 이동: `PATCH /api/employees/[id]` (orgUnitId 변경 + AuditLog)
- [x] 구성원 퇴사 처리: `POST /api/employees/[id]/offboard`
- [x] 라이선스 갱신 상태 변경: `PUT /api/licenses/[id]/renewal-status`
- [x] 라이선스 갱신 이력 조회: `GET /api/licenses/[id]/renewal-history`
- [x] 라이선스 갱신일 수동 설정: `PUT /api/licenses/[id]/renewal-date`
- [x] 라이선스 담당자 관리: `GET|POST|DELETE /api/licenses/[id]/owners`
- [x] Admin 비밀번호 리셋: `POST /api/admin/users/[id]/reset-password`
- [x] Admin 사용자 삭제: `DELETE /api/admin/users/[id]`
- [x] `GET /api/history` (AuditLog 조회 REST API)

### 백엔드 — 배치/스케줄러
> 구현 완료 (2026-03-06). `scripts/` 에서 `npx tsx`로 실행.
- [x] OFFBOARDING 자동 삭제 배치 (`scripts/offboarding-cleanup.ts`)
  - 매일 실행, `offboardingUntil` 경과 구성원 삭제 + 배정 반납 + tombstone AuditLog
- [x] 라이선스 갱신 알림 스케줄러 (`scripts/renewal-notification.ts`)
  - D-70, D-30, D-15, D-7 시점 알림
  - Slack 발송 (`SLACK_WEBHOOK_URL` 환경변수 설정 시)
  - Email 발송 (SMTP 연동 시 — 현재 폐쇄망 미설정)
  - NotificationLog 기록 (성공/실패 모두)

### 프론트엔드 — 신규 UI
> 백엔드 API 전체 완료. 모든 항목 착수 가능.
- [ ] **[착수 가능]** OrgUnit 트리 편집 UI — `/org` 페이지에 생성·수정·삭제 버튼 추가
  - 삭제 확인 모달: 하위 부서 목록 + 영향 구성원 수 표시 + "삭제하겠습니다" 문구 입력 요구
- [ ] **[착수 가능]** 구성원 조직 이동 UI — 구성원 상세 페이지에서 소속 부서 변경 드롭다운
- [ ] **[착수 가능]** 구성원 중복 이름 구분 표시 (이름 + 이메일 앞부분 마스킹 함께 노출)
- [ ] **[착수 가능]** 구성원 퇴사 처리 UI (상태 변경 + 유예일 표시)
- [ ] **[착수 가능]** 라이선스 갱신 상태 변경 UI (상태 드롭다운 + 메모 입력)
- [ ] **[착수 가능]** 라이선스 갱신 이력 뷰 (타임라인 형태)
- [ ] **[착수 가능]** 알림 담당자 설정 UI (개인 또는 부서 지정)

### 프론트엔드 — UI 개선
> 기존 API로 바로 착수 가능
- [ ] **[착수 가능]** 라이선스 목록 페이지 페이지네이션 (대량 데이터 대응)
- [ ] **[착수 가능]** 구성원 목록 검색·필터 기능 (이름, 부서, 상태)
- [ ] 모바일 반응형 레이아웃 검토

---

## 🟢 Phase 4 — 정보자산 증적 시스템 (Phase 3 완료 후 착수)

> 스펙: `tasks/features/asset-archiving.md`
> ISO27001/ISMS-P 기준 월별 자산 자동 증적 + 구글드라이브 연동

### 백엔드 (`role/backend`)

**DB 마이그레이션:**
- [ ] **[BE-040]** ExchangeRate 테이블 생성 (환율 이력)
- [ ] **[BE-041]** AssetCategory 테이블 생성 (관리자 설정 카테고리)
- [ ] **[BE-042]** Archive 테이블 생성 (증적 메타데이터)
- [ ] **[BE-043]** ArchiveLog 테이블 생성 (작업 로그)
- [ ] **[BE-044]** License: `isVatIncluded` 컬럼 추가
- [ ] **[BE-045]** ArchiveData 테이블 생성 (스냅샷 데이터)
- [ ] **[BE-046]** `prisma generate` 실행

**API 구현:**
- [ ] **[BE-047]** AssetCategory CRUD: `GET|POST|PUT|DELETE /api/admin/asset-categories/[id]`
- [ ] **[BE-048]** ExchangeRate 조회: `GET /api/admin/exchange-rates`
- [ ] **[BE-049]** ExchangeRate 동기화: `POST /api/admin/exchange-rates/sync`
- [ ] **[BE-050]** 증적 목록: `GET /api/admin/archives`
- [ ] **[BE-051]** 수동 내보내기: `POST /api/admin/archives/export` (비동기)
- [ ] **[BE-052]** 증적 상태: `GET /api/admin/archives/[id]/status`
- [ ] **[BE-053]** 증적 로그: `GET /api/admin/archives/[id]/logs`
- [ ] **[BE-054]** 증적 삭제: `DELETE /api/admin/archives/[id]`

**배치 및 내보내기:**
- [ ] **[BE-055]** 정기 증적 배치 (매월 1일 00:00, 지난 1달 데이터)
- [ ] **[BE-056]** 환율 동기화 배치 (매일 09:00, OpenExchangeRates API)
- [ ] **[BE-057]** Excel 생성 (4개 시트: 자산현황, 조직원, 변경이력, 비용요약)
- [ ] **[BE-058]** CSV 생성 (데이터 정제 형식)
- [ ] **[BE-059]** 환율 자동 적용 (단가 × 수량 × 환율 × VAT)
- [ ] **[BE-060]** 변경 이력 추출 (AuditLog 기반)

**Google Drive 통합:**
- [ ] **[BE-061]** OAuth 2.0 설정 (service account)
- [ ] **[BE-062]** 구글드라이브 업로드 라이브러리
- [ ] **[BE-063]** 폴더 생성 및 경로 관리 (YYYY/YYYY-MM)
- [ ] **[BE-064]** 파일 공유 (이메일 선택)
- [ ] **[BE-065]** 업로드 실패 시 재시도 로직

### 프론트엔드 (`role/frontend`)
- [ ] **[FE-030]** `/admin/asset-categories` — 카테고리 관리 페이지
- [ ] **[FE-031]** `/admin/archives` — 증적 목록 및 수동 내보내기
- [ ] **[FE-032]** 증적 상태 모니터링 UI (진행률, 로그)
- [ ] **[FE-033]** 기간 선택 캘린더 (최대 5년)
- [ ] **[FE-034]** 환율 관리 UI (환율 조회, 동기화 트리거)

---

## 완료된 기능 (master 반영)

<details>
<summary>펼치기</summary>

### 인증
- [x] 로그인 / 로그아웃 / 세션 확인
- [x] ADMIN / USER 역할 분리
- [x] 로그인 브루트포스 방어

### 라이선스 관리
- [x] 라이선스 CRUD, 시트 관리, 중복 검사
- [x] 갱신 상태·일자·이력·담당자 관리
- [x] 라이선스 그룹 + 기본 그룹 자동 할당

### 할당·반납
- [x] 라이선스 할당 (Server Action)
- [x] 반납 / 삭제

### 조직원 관리
- [x] CRUD, 조직 이동, 퇴사 처리(7일 유예)

### 조직 관리
- [x] 회사(OrgCompany) / OrgUnit CRUD + 삭제 프리뷰

### 배치/스케줄러
- [x] OFFBOARDING 자동 삭제 (`POST /api/cron/offboard`)
- [x] 갱신 알림 (`POST /api/cron/renewal-notify`, D-70/30/15/7)

### Admin
- [x] 사용자 CRUD, 삭제, 임시 비밀번호 발급

### 대시보드 / 감사 로그 / CSV
- [x] 대시보드 차트, 감사 로그, CSV 임포트

</details>
