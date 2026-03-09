# TODO (Legacy - See New System Below)

> ⚠️ **IMPORTANT: This file has been superseded by a new documentation system. Please read below.**

---

## 🚨 새로운 문서 시스템 (2026-03-07 업데이트)

**현재 활성 작업을 확인하려면 다음 파일들을 참조하세요**:

| 문서 | 용도 |
|------|------|
| **`tasks/TICKETS.md`** ⭐ | **모든 활성 티켓 (우선순위 2: 배포 전 마무리)** |
| **`tasks/VISION.md`** ⭐ | 프로젝트의 최종 목표 및 5단계 로드맵 |
| **`tasks/README.md`** ⭐ | 역할별 문서 가이드 |
| `BACKEND-START.md` | 백엔드 역할 빠른 시작 |
| `FRONTEND-START.md` | 프론트엔드 역할 빠른 시작 |
| `DEVOPS-START.md` | DevOps 역할 빠른 시작 |
| `tasks/current-state.md` | 현재 프로젝트 상태 |

**각 역할별 시작하기**:
- 🔵 **Backend**: `BACKEND-START.md` → `tasks/TICKETS.md` (BE-ORG-001, BE-ORG-002)
- 🎨 **Frontend**: `FRONTEND-START.md` → `tasks/TICKETS.md` (FE-001, FE-ORG-001)
- 🟢 **DevOps**: `DEVOPS-START.md` → `tasks/TICKETS.md` (OPS-010/011/001/002)
- 🎯 **Planning**: `tasks/VISION.md` → `tasks/TICKETS.md` 관리

---

## ⚙️ 이 파일에 대해

이 `todo.md` 파일은 **역사적 기록용**으로 남겨져 있습니다:
- ✅ **완료된 작업들의 이력** (Supabase 전환, 감사 로그 추가, 입력 검증 강화 등)
- ✅ **완료된 기능** 목록
- 📚 **Phase 2-5의 미래 계획** (참고용)

**활성 작업은 `tasks/TICKETS.md`를 참조하세요.**

---

## 🔴 우선순위 1 — Supabase(PostgreSQL) 전환 (배포 블로커) ✅ COMPLETED

> ✅ **이 섹션은 완료된 작업의 역사입니다.** 자세한 내용은 `tasks/current-state.md` 참조.
>
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

## 🟡 우선순위 2 — 배포 전 마무리 🔴 NOW ACTIVE

> ⚠️ **이 섹션의 항목들은 아래 요약이므로, 자세한 요구사항은 반드시 `tasks/TICKETS.md`를 참조하세요.**
>
> 각 역할이 실제 작업할 때는:
> - 🔵 **Backend**: `BACKEND-START.md` → BE-ORG-001, BE-ORG-002 in `TICKETS.md`
> - 🎨 **Frontend**: `FRONTEND-START.md` → FE-001, FE-ORG-001 in `TICKETS.md`
> - 🟢 **DevOps**: `DEVOPS-START.md` → OPS-010/011/001/002 in `TICKETS.md`

### 프론트엔드 (`role/frontend`)

- [ ] **[FE-001]** `mustChangePassword` 강제 비밀번호 변경 UI
  - 로그인 후 플래그 `true` 시 비밀번호 변경 페이지로 강제 리다이렉트
  - 변경 완료 시 `PUT /api/admin/users/[id]` 로 플래그 해제

- [ ] **[FE-ORG-001]** `/org` 페이지 — 회사(Company) CRUD UI 추가
  - 상단 "새 회사 생성" 버튼 추가 (모달)
  - 회사 카드에 "수정" 버튼 추가 (모달)
  - 회사 카드에 "삭제" 버튼 추가 (확인 모달)
  - 삭제 전 영향 범위 표시 (소속 부서 수, 영향 조직원 수)
  - 삭제 확인 텍스트: "삭제하겠습니다"

### 백엔드 (`role/backend`)

- [ ] **[BE-ORG-001]** `PUT /api/org/companies/[id]` — 회사 이름 수정
  - 요청: `{ name: string }`
  - 중복 검증 (409 에러)
  - AuditLog 기록 (UPDATED)

- [ ] **[BE-ORG-002]** `DELETE /api/org/companies/[id]` — 회사 삭제
  - 소속 부서 확인 (있으면 409 에러)
  - AuditLog 기록 (DELETED)

---

## 🔵 우선순위 3 — 배포 후 (사람이 직접) 📚 REFERENCE

> 이 섹션은 배포 후 진행할 작업 목록입니다. 자세한 내용은 `tasks/VISION.md` 참조.

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

### P2 — 입력 검증 강화 (ISMS-P 2.8) ✅ 완료

> lib/validation.ts 공용 유틸리티 + 15개 API 라우트 적용 완료.

- [x] **[BE-P2-01]** 문자열 길이 제한 추가 ✅
- [x] **[BE-P2-02]** 숫자 범위 검증 추가 ✅
- [x] **[BE-P2-03]** 날짜 검증 추가 ✅
- [x] **[BE-P2-04]** enum 유효성 — silent default 제거 ✅

### P3 — 성능 개선 ✅ 완료 (P3-01, P3-02)

> P3-01/02 최적화 완료. P3-03 페이지네이션은 Phase 2 이후 검토.

- [x] **[BE-P3-01]** 신규 조직원 자동 할당 N+1 쿼리 개선 ✅
  - `POST /api/employees` — 개별 count → groupBy 배치 쿼리 (150+ → 3 쿼리)
- [x] **[BE-P3-02]** OrgUnit 삭제 시 재귀 쿼리 개선 ✅
  - `collectDescendantIds()` — 전체 트리 1회 로딩 + 인메모리 BFS
- [ ] **[BE-P3-03]** 목록 API 페이지네이션 추가 (현재 /history만 지원)
  - `GET /api/licenses`, `GET /api/assignments`, `GET /api/groups`

### P4 — 코드 일관성 ✅ 완료

> 7개 라우트 FK 검증 + 20개 라우트 handlePrismaError 적용 완료.

- [x] **[BE-P4-01]** FK 존재 검증 추가 ✅
  - 7개 라우트: org/units, employees, groups, licenses/owners
  - companyId, parentId, orgUnitId, userId, licenseIds[] 배치 검증
- [x] **[BE-P4-02]** 에러 응답 패턴 통일 ✅
  - `handlePrismaError` 유틸리티: P2002→409, P2003→400, P2025→404
  - 기존 `error.message.includes("Unique constraint")` 전량 교체

---

## 🟢 Phase 2 — 자산 유형 확장 (Supabase 전환 후 착수) 📚 ROADMAP

> 📌 **미래 계획입니다.** 자세한 내용은 `tasks/VISION.md` (roadmap) 및 스펙 문서 참조.
>
> 스펙: `tasks/features/asset-management.md`, `tasks/features/org-and-dashboard-improvements.md`

### 백엔드 (`role/backend`)
- [ ] **[BE-020]** `prisma/schema.prisma` — `Asset`, `HardwareDetail`, `CloudDetail` 모델 추가
  - AssetType enum (SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER)
  - AssetStatus enum (ACTIVE, INACTIVE, DISPOSED)
- [ ] **[BE-021]** `GET|POST /api/assets` — 자산 목록 조회·등록
- [ ] **[BE-022]** `GET|PUT|DELETE /api/assets/[id]` — 자산 상세·수정·삭제
- [ ] **[BE-023]** `PATCH /api/assets/[id]/status` — 자산 상태 변경 (INACTIVE / DISPOSED)
- [ ] **[BE-024]** `GET /api/assets/expiring` — 만료 임박 자산 목록
- [ ] **[BE-025]** `POST /api/cron/renewal-notify` — Asset 만료 알림 통합 (expiryDate 기준)

### 프론트엔드 (`role/frontend`)
- [ ] **[FE-010]** `/assets` — 자산 목록 페이지 (탭: 전체·소프트웨어·클라우드·하드웨어·도메인)
  - 각 탭별 필터링 및 정렬
  - 자산 상태 배지 (ACTIVE/INACTIVE/DISPOSED)
- [ ] **[FE-011]** `/assets/new` — 자산 등록 폼 (유형별 추가 필드 동적 표시)
  - SOFTWARE: 라이선스 키, 버전
  - CLOUD: 플랫폼, 계정ID, 좌석 수
  - HARDWARE: 제조사, 모델, SN, 위치
  - DOMAIN_SSL: 도메인명, 인증서 유효기간
- [ ] **[FE-012]** `/assets/[id]` — 자산 상세 페이지
  - 자산 정보 + 유형별 상세정보
  - 할당 이력 (Assignment history)

---

## 🟢 Phase 3 — 월별 비용 보고서 + 통합 대시보드 (Phase 2 완료 후 착수) 📚 ROADMAP

> 📌 **미래 계획입니다.** 자세한 내용은 `tasks/VISION.md` 참조.
>
> 스펙: `tasks/features/monthly-report.md`, `tasks/features/org-and-dashboard-improvements.md`

### 백엔드 (`role/backend`)

**대시보드 통합 API:**
- [ ] **[BE-030]** `GET /api/dashboard/overview` — 전체 자산 집계 (비용, 만료, 상태)
- [ ] **[BE-031]** `GET /api/dashboard/by-category?type=SOFTWARE` — 카테고리별 대시보드

**월별 보고서 API:**
- [ ] **[BE-032]** `GET /api/reports/monthly?month=2026-02` — 월별 종합 보고서
- [ ] **[BE-033]** `GET /api/reports/monthly/export?format=xlsx` — Excel 내보내기
- [ ] **[BE-034]** `GET /api/reports/monthly/export?format=pdf` — PDF 내보내기
- [ ] **[BE-035]** `GET /api/reports/history` — 보고서 생성 이력

### 프론트엔드 (`role/frontend`)

**통합 대시보드:**
- [ ] **[FE-020]** `/dashboard` 확장 — 통합 자산 현황
  - 탭: 개요 / 라이선스 / 클라우드 / 하드웨어 / 도메인SSL
- [ ] **[FE-021]** `/dashboard?type=SOFTWARE` — 라이선스 전용 대시보드
- [ ] **[FE-022]** `/dashboard?type=CLOUD` — 클라우드 전용 대시보드
- [ ] **[FE-023]** `/dashboard?type=HARDWARE` — 하드웨어 전용 대시보드
- [ ] **[FE-024]** `/dashboard?type=DOMAIN_SSL` — 도메인/SSL 전용 대시보드

**월별 보고서 페이지:**
- [ ] **[FE-025]** `/reports` — 월별 종합 보고서
- [ ] **[FE-026]** 보고서 공유 기능 (이메일)

---

## 🟢 Phase 4 — 정보자산 증적 시스템 (Phase 3 완료 후 착수) 📚 ROADMAP

> 📌 **미래 계획입니다. 최종 목표입니다.** 자세한 내용은 `tasks/VISION.md` 참조.
>
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

---

## 📋 요약: 이 파일의 역할

| 섹션 | 상태 | 참고 |
|------|------|------|
| **우선순위 1 (Supabase 전환)** | ✅ COMPLETED | 역사 기록용 |
| **우선순위 2 (배포 전 마무리)** | 🔴 NOW ACTIVE | 👉 `TICKETS.md` 참조 (상세) |
| **우선순위 3 (배포 후)** | 📌 REFERENCE | 배포 후 진행 사항 |
| **Phase 2-4 (미래 계획)** | 📚 ROADMAP | `VISION.md` 참조 |
| **완료된 기능** | 📚 REFERENCE | 구현된 기능 목록 |

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
