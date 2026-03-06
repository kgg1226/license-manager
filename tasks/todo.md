# TODO

> 기획 세션(/planning)에서 관리한다.
> 최종 업데이트: 2026-03-05

---

## 🔴 우선순위 1 — Supabase(PostgreSQL) 전환 (배포 블로커)

> SQLite → Supabase PostgreSQL 전환. 코드 전면 수정 필요.
> **백엔드 + DevOps 동시 진행 가능. 완료 후 deploy.ps1 실행.**

### 백엔드 (`role/backend`)

- [x] **[BE-010]** `prisma/schema.prisma` — DB 프로바이더 변경 ✅ postgresql 전환 완료
- [x] **[BE-011]** `lib/prisma.ts` — better-sqlite3 어댑터 제거 ✅ 표준 PrismaClient 전환 완료
- [x] **[BE-012]** `package.json` — SQLite 관련 패키지 제거 ✅ 3개 패키지 제거 완료
- [x] **[BE-013]** Supabase 마이그레이션 초기화 ✅ `prisma migrate dev --name supabase_init` 완료

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

### P1 — 감사 로그 누락 (ISMS-P 2.11 컴플라이언스) ✅ 완료

> 30개 데이터 변경 API 전수에 AuditLog 기록 추가 완료.

- [x] **[BE-P1-01]** 라이선스 CRUD AuditLog 추가 ✅
- [x] **[BE-P1-02]** 조직원 생성·수정·삭제 AuditLog 추가 ✅
- [x] **[BE-P1-03]** 사용자 관리 AuditLog 추가 ✅
- [x] **[BE-P1-04]** 그룹·할당·담당자·조직 변경 AuditLog 추가 ✅

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

## 🟢 Phase 3 — 월별 비용 보고서 (Phase 2 완료 후 착수)

> 스펙: `tasks/features/monthly-report.md`

### 백엔드 (`role/backend`)
- [ ] **[BE-030]** `GET /api/reports/monthly` — 보고서 집계 API (유형별·부서별·변동·만료 예정)
- [ ] **[BE-031]** `GET /api/reports/monthly/export?format=xlsx` — Excel 내보내기 (`exceljs`)
- [ ] **[BE-032]** `GET /api/reports/monthly/export?format=pdf` — PDF 내보내기 (`@react-pdf/renderer`)
- [ ] **[BE-033]** `GET /api/reports/history` — 보고서 생성 이력

### 프론트엔드 (`role/frontend`)
- [ ] **[FE-020]** `/reports` — 월별 보고서 페이지 (요약 카드·차트·테이블)
- [ ] **[FE-021]** Excel / PDF 내보내기 버튼

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
