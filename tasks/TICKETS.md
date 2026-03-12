# 🎫 활성 티켓 (Active Tickets)

> **Phase 2: 자산 유형 확장 (Asset Management Abstraction)**
>
> 라이선스 → 통합 자산 관리로 확장
> 소프트웨어, 클라우드, 하드웨어, 도메인 등 모든 IT 자산 통합 관리
>
> **상태**: 티켓 오픈 (2026-03-07)
> **목표 완료일**: 2026-03-28 (3주)
>
> 📌 **Priority 2 (배포 전 마무리) ✅ COMPLETED**
> - FE-001, FE-ORG-001, BE-ORG-001, BE-ORG-002, OPS-010/011/001/002 모두 완료
> - 배포 준비 완료 → 다음 단계: 자산 관리 기능 확장

---

## 👥 Role별 티켓 할당

---

## 🎯 BACKEND 티켓

### [BE-020] Prisma Schema — Asset 모델 추가

**담당**: Backend Role
**우선순위**: 🔴 Critical (Phase 2 블로커)
**난이도**: 🟡 중간 (1-2일)
**상태**: 🔴 오픈

#### 배경
- 현재: License 중심의 라이선스 관리 시스템
- 목표: Asset 기반의 통합 자산 관리 시스템으로 확장
- 자산 유형: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
- 각 자산은 할당, 비용, 만료일, 상태 관리 필요

#### 요구사항
- [ ] `prisma/schema.prisma` 수정
  - `Asset` 테이블 (기본 자산 정보)
  - `AssetType` enum: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
  - `AssetStatus` enum: ACTIVE, INACTIVE, DISPOSED

- [ ] Asset 모델 구조:
  ```prisma
  model Asset {
    id String @id @default(cuid())
    name String @db.VarChar(255)
    type AssetType
    status AssetStatus @default(ACTIVE)

    description String? @db.Text
    cost Decimal @db.Decimal(15, 2)
    currency String @default("USD")
    expiryDate DateTime?

    // 할당 정보
    assignments Assignment[]
    assignedTo Employee?
    assignedToId String?

    // 메타데이터
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    createdBy String

    // 감사
    auditLogs AuditLog[]
  }

  enum AssetType {
    SOFTWARE
    CLOUD
    HARDWARE
    DOMAIN_SSL
    OTHER
  }

  enum AssetStatus {
    ACTIVE
    INACTIVE
    DISPOSED
  }
  ```

- [ ] Assignment 모델 확장
  - `Asset`과의 관계 추가
  - License → Asset 마이그레이션 지원

- [ ] AuditLog 지원
  - entityType: ASSET 추가
  - 자산 생성/수정/삭제 로깅

#### 완료 조건
- [ ] Prisma schema 수정 완료
- [ ] `prisma migrate dev` 실행
- [ ] Prisma 클라이언트 재생성 (`prisma generate`)
- [ ] DB 마이그레이션 파일 생성됨
- [ ] 기존 License 기능 영향 없음

#### 기술 사항
- **파일**: `prisma/schema.prisma`
- **명령어**:
  ```bash
  npx prisma migrate dev --name add_asset_model
  npx prisma generate
  ```
- **참고**: `generated/prisma/` 업데이트 확인

#### 종속성
- 없음 (독립적, 모든 API의 기반)

---

### [BE-021] GET|POST /api/assets — 자산 목록 및 등록

**담당**: Backend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (1-2일)
**상태**: 🔴 오픈

#### 배경
- Asset 테이블이 생성된 후 기본 CRUD API 필요
- 목록 조회: 필터링, 정렬, 페이지네이션 지원
- 자산 등록: 유효성 검증, AuditLog 기록

#### 요구사항

**GET /api/assets (목록 조회)**
- [ ] 쿼리 파라미터 지원
  - `type`: AssetType 필터 (SOFTWARE, CLOUD 등)
  - `status`: AssetStatus 필터 (ACTIVE, INACTIVE, DISPOSED)
  - `search`: 자산명 검색
  - `skip`, `take`: 페이지네이션 (기본값: skip=0, take=20)
  - `sortBy`: 정렬 필드 (name, cost, expiryDate, createdAt)
  - `sortOrder`: asc, desc

- [ ] 응답 형식
  ```json
  {
    "total": 150,
    "data": [
      {
        "id": "...",
        "name": "Microsoft 365",
        "type": "SOFTWARE",
        "status": "ACTIVE",
        "cost": 1200.00,
        "currency": "USD",
        "expiryDate": "2026-12-31",
        "assignedTo": { "id": "...", "name": "이순신" },
        "createdAt": "2026-01-15",
        "updatedAt": "2026-03-07"
      }
    ]
  }
  ```

- [ ] 권한 검증: 로그인 사용자만

**POST /api/assets (자산 등록)**
- [ ] 요청 바디
  ```json
  {
    "name": "AWS EC2 Instance",
    "type": "CLOUD",
    "description": "Production server",
    "cost": 500.00,
    "currency": "USD",
    "expiryDate": "2027-03-07",
    "assignedToId": "user-id" (선택)
  }
  ```

- [ ] 유효성 검증
  - name: 필수, max 255자
  - type: enum 중 하나만
  - cost: 0 이상
  - expiryDate: ISO 8601 형식

- [ ] AuditLog 기록
  - action: CREATED
  - entityType: ASSET
  - details: `{ name, type, cost }`

- [ ] 응답: 201 Created
  ```json
  {
    "id": "...",
    "name": "AWS EC2 Instance",
    ...
  }
  ```

#### 완료 조건
- [ ] GET 엔드포인트 구현
- [ ] POST 엔드포인트 구현
- [ ] 페이지네이션 정상 작동
- [ ] 필터링 정상 작동
- [ ] AuditLog 기록 확인
- [ ] 테스트 완료

#### 기술 사항
- **파일**: `app/api/assets/route.ts` (새로)
- **라이브러리**:
  - `lib/validation.ts` (유효성 검증)
  - `lib/audit-log.ts` (감사 로깅)
  - `lib/prisma.ts` (DB 쿼리)

#### 종속성
- BE-020 (Asset 모델)

---

### [BE-022] GET|PUT|DELETE /api/assets/[id] — 자산 상세·수정·삭제

**담당**: Backend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (2일)
**상태**: 🔴 오픈

#### 요구사항

**GET /api/assets/[id] (상세 조회)**
- [ ] Asset 상세 정보 반환
- [ ] 할당 이력 포함 (Assignment)
- [ ] 감사 로그 링크 포함

**PUT /api/assets/[id] (수정)**
- [ ] 수정 가능 필드
  - name, description, cost, currency, expiryDate

- [ ] AuditLog 기록 (변경 사항만)

**DELETE /api/assets/[id] (삭제)**
- [ ] 소프트 삭제 또는 하드 삭제
  - 상태: DISPOSED로 변경 (권장)
  - 또는 아예 삭제

- [ ] AuditLog 기록

#### 완료 조건
- [ ] 3개 메서드 모두 구현
- [ ] 권한 검증
- [ ] 에러 처리 (404, 400, 403 등)
- [ ] 테스트 완료

#### 기술 사항
- **파일**: `app/api/assets/[id]/route.ts` (새로)

#### 종속성
- BE-020, BE-021

---

### [BE-023] PATCH /api/assets/[id]/status — 자산 상태 변경

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟢 낮음 (0.5일)
**상태**: 🔴 오픈

#### 배경
- 자산 상태 변경: ACTIVE → INACTIVE → DISPOSED
- 배포 후 폐기 처리 시 필요

#### 요구사항
- [ ] 요청 바디: `{ status: "INACTIVE" | "DISPOSED" }`
- [ ] 응답: 200 OK
- [ ] AuditLog 기록

#### 종속성
- BE-020

---

### [BE-024] GET /api/assets/expiring — 만료 임박 자산

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟢 낮음 (1일)
**상태**: 🔴 오픈

#### 배경
- 만료 예정 자산 미리 파악
- 대시보드에 표시할 정보

#### 요구사항
- [ ] 쿼리: `?days=30` (30일 내 만료)
- [ ] 응답: 만료 임박 자산 목록
- [ ] 정렬: expiryDate 기준 오름차순

#### 종속성
- BE-020, BE-021

---

### [BE-025] POST /api/cron/renewal-notify — 만료 알림 통합

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟡 중간 (2일)
**상태**: 🔴 오픈

#### 배경
- 기존: License 만료 알림만 지원
- 목표: Asset 만료 알림도 통합

#### 요구사항
- [ ] Asset의 expiryDate 기반 알림
- [ ] Slack/Email 발송
- [ ] 배치 스케줄러 등록 (매월 1일 등)

#### 종속성
- BE-020 ~ BE-024

---

## 🎨 FRONTEND 티켓

### [FE-010] /assets — 자산 목록 페이지

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (3-4일)
**상태**: ✅ COMPLETED (2026-03-08)

#### 배경
- 자산 관리의 핵심 페이지
- 모든 IT 자산 통합 조회
- 필터링, 검색, 정렬 지원

#### 요구사항
- [ ] `/assets` 라우트 추가
- [ ] 탭 인터페이스
  - 전체 / SOFTWARE / CLOUD / HARDWARE / DOMAIN_SSL / 기타
  - 각 탭별로 자동 필터링

- [ ] 테이블 또는 카드 뷰
  - 컬럼: 자산명, 유형, 상태, 비용, 만료일, 할당자
  - 상태별 배지 (ACTIVE, INACTIVE, DISPOSED)

- [ ] 기능
  - 검색: 자산명 검색
  - 정렬: 비용, 만료일, 생성일
  - 페이지네이션
  - 대량 선택 (미래 확장용)

- [ ] 새 자산 버튼
  - `/assets/new` 링크

- [ ] 각 자산 클릭 → 상세 페이지

#### 완료 조건
- [ ] 페이지 구현 완료
- [ ] API 호출 정상
- [ ] 필터/검색/정렬 정상
- [ ] 모바일 반응형 검증

#### 기술 사항
- **파일**: `app/assets/page.tsx` (새로)
- **API**: GET /api/assets

#### 종속성
- BE-021

---

### [FE-011] /assets/new — 자산 등록 폼

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (2-3일)
**상태**: ✅ COMPLETED (2026-03-08)

#### 요구사항
- [ ] 자산 유형별 동적 폼
  - SOFTWARE: 라이선스 키, 버전, 라이센스 수
  - CLOUD: 플랫폼, 계정ID, 좌석 수
  - HARDWARE: 제조사, 모델, SN, 위치
  - DOMAIN_SSL: 도메인명, 인증서 유효기간
  - OTHER: 자유 형식

- [ ] 공통 필드
  - 자산명 (필수)
  - 설명 (선택)
  - 비용
  - 통화
  - 만료일
  - 할당 대상 (선택)

- [ ] 폼 검증
  - 필수 필드 확인
  - 비용 숫자 검증
  - 날짜 형식 검증

- [ ] 제출 시 POST /api/assets 호출

#### 완료 조건
- [ ] 폼 구현 완료
- [ ] 유형별 필드 동적 표시
- [ ] 검증 및 에러 처리
- [ ] 성공 메시지 & 리다이렉트

#### 기술 사항
- **파일**: `app/assets/new/page.tsx` (새로)
- **API**: POST /api/assets

#### 종속성
- BE-021

---

### [FE-012] /assets/[id] — 자산 상세 페이지

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (2-3일)
**상태**: ✅ COMPLETED (2026-03-08)

#### 요구사항
- [ ] 자산 정보 표시
  - 기본 정보 (이름, 유형, 상태, 비용)
  - 유형별 추가 정보
  - 할당 정보
  - 만료일

- [ ] 액션 버튼
  - 수정 (FE-ORG-001 패턴 참고)
  - 상태 변경 (ACTIVE → INACTIVE → DISPOSED)
  - 삭제

- [ ] 할당 이력
  - 이 자산이 누구에게 할당되었는지
  - 할당/반납 이력

- [ ] 감사 로그 링크
  - 이 자산의 변경 이력 조회

#### 완료 조건
- [ ] 상세 페이지 구현
- [ ] 편집 모달 추가
- [ ] 상태 변경 기능
- [ ] 삭제 확인 모달

#### 기술 사항
- **파일**: `app/assets/[id]/page.tsx` (새로)
- **API**: GET /api/assets/[id], PUT /api/assets/[id], DELETE /api/assets/[id]

#### 종속성
- BE-022

---

## 📋 종합 테이블

| 티켓 | Role | 우선순위 | 난이도 | 상태 | 예상 기간 |
|------|------|---------|--------|------|----------|
| BE-020 | Backend | 🔴 Critical | 🟡 중간 | ✅ 완료 | 1-2일 |
| BE-021 | Backend | 🔴 Critical | 🟡 중간 | ✅ 완료 | 1-2일 |
| BE-022 | Backend | 🔴 Critical | 🟡 중간 | ✅ 완료 | 2일 |
| BE-023 | Backend | 🟠 높음 | 🟢 낮음 | ✅ 완료 | 0.5일 |
| BE-024 | Backend | 🟠 높음 | 🟢 낮음 | ✅ 완료 | 1일 |
| BE-025 | Backend | 🟠 높음 | 🟡 중간 | ✅ 완료 | 2일 |
| FE-010 | Frontend | 🔴 Critical | 🟡 중간 | ✅ 완료 (2026-03-08) | 3-4일 |
| FE-011 | Frontend | 🔴 Critical | 🟡 중간 | ✅ 완료 (2026-03-08) | 2-3일 |
| FE-012 | Frontend | 🔴 Critical | 🟡 중간 | ✅ 완료 (2026-03-08) | 2-3일 |
| BE-040 | Backend | 🔴 Critical | 🟡 중간 | ✅ 완료 (PR #34) | 2-3일 |
| FE-040 | Frontend | 🔴 Critical | 🟡 중간 | ✅ 완료 | 3-4일 |

**Phase 2~3-1 모든 티켓 완료.** Phase 4 잔여 + Phase 5 신규 티켓은 아래 참조.

---

## 🎯 진행 순서 (권장)

### Phase 1: DB & API 기반 (Week 1)
1. **BE-020**: Prisma Schema (Asset 모델) → `prisma migrate`
2. **BE-021**: GET|POST /api/assets
3. **BE-022**: GET|PUT|DELETE /api/assets/[id]
4. **BE-023, BE-024**: 보조 API

→ **Frontend가 API 호출 가능하도록**

### Phase 2: Frontend UI (Week 2)
- **FE-010**: /assets 목록 페이지
- **FE-011**: /assets/new 등록 폼
- **FE-012**: /assets/[id] 상세 페이지

→ **완전한 Asset CRUD 기능 구현**

### Phase 3: 통합 & 마무리 (Week 3)
- **BE-025**: 만료 알림 통합
- 통합 테스트
- 배포 준비

---

## ✅ 완료 기준

이 Phase 2 티켓들이 모두 완료되면:
- ✅ Asset CRUD (생성·조회·수정·삭제) 완전 구현
- ✅ 자산 유형 관리 (SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL 등)
- ✅ 자산 상태 관리 (ACTIVE, INACTIVE, DISPOSED)
- ✅ 자산 할당 & 이력 관리
- ✅ 자산 검색·필터링·정렬
- ✅ 자산 만료 알림
- ✅ Phase 3-1 (라이선스 계층) 진행 가능

---

## 🎨 PHASE 3-1: 라이선스 계층 구조 (License Hierarchy)

> **개요**: 라이선스 계층화 (부모-자식 관계)
> - Open VPN (상위) → Domain1, Domain2 (하위)
> - Figma (상위) → Full, Dev, Figjam (하위)
>
> **상태**: ✅ 완료 (2026-03-12 코드 검증)
> **목표 완료일**: 2026-03-21 (2주) — 실제 완료됨
> **스펙**: `tasks/features/license-hierarchy.md`

---

### [BE-040] Prisma Schema — License `parentId` 추가 & API 수정

**담당**: Backend Role
**우선순위**: 🔴 Critical (Phase 3-1 블로커)
**난이도**: 🟡 중간 (2-3일)
**상태**: ✅ 완료 (PR #34, 2026-03-10)

#### 배경
- 라이선스를 계층화하여 관리
- 예: Open VPN (상위) 아래 Domain1, Domain2 (하위)
- CSV 임포트도 `parentLicenseName` 필드 지원

#### 요구사항

**[1] Prisma Schema 수정**
- [ ] License 모델에 `parentId` 필드 추가
  ```prisma
  model License {
    ...
    parentId  Int?
    parent    License? @relation("LicenseHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
    children  License[] @relation("LicenseHierarchy")
  }
  ```

- [ ] 마이그레이션 생성: `prisma migrate dev --name add_license_hierarchy`
- [ ] `prisma generate` 실행

**[2] GET /api/licenses API 수정**
- [ ] 계층 구조로 정렬 (부모 먼저, 하위는 들여쓰기)
- [ ] 응답에 `depth`, `parentId`, `children` 포함
  ```json
  {
    "id": 1,
    "name": "Open VPN",
    "parentId": null,
    "children": [{ "id": 2, "name": "Domain1" }, { "id": 3, "name": "Domain2" }]
  }
  ```

**[3] PUT /api/licenses/[id] API 수정**
- [ ] `parentId` 필드 수정 허용
- [ ] 순환 참조 검증 (A→B→A 불가)
  ```
  if (parentId) {
    // Check: parent of parentId should not be this license
  }
  ```
- [ ] 자신을 부모로 설정 불가

**[4] CSV Import 수정**
- [ ] `app/settings/import/templates.ts`: license 헤더에 `parentLicenseName` 추가
- [ ] `app/settings/import/actions.ts`: `importLicenses` 함수 수정
  - `parentLicenseName` 파싱
  - 존재 여부 검증
  - `parentId` 설정

#### 완료 조건
- [ ] 마이그레이션 생성 및 실행
- [ ] GET API: 계층 구조 정렬 정상 작동
- [ ] PUT API: parentId 업데이트 정상 작동
- [ ] 순환 참조 테스트 (에러 발생 확인)
- [ ] CSV import: parentLicenseName 정상 파싱
- [ ] 테스트 완료

#### 기술 사항
- **파일**:
  - `prisma/schema.prisma`
  - `prisma/migrations/` (자동 생성)
  - `app/api/licenses/route.ts`
  - `app/settings/import/templates.ts`
  - `app/settings/import/actions.ts`

#### 종속성
- 없음 (License 기능만 영향)

---

### [FE-040] License UI — 계층 구조 표시 및 편집

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (3-4일)
**상태**: ✅ 완료 (2026-03-12 코드 검증)

#### 요구사항

**[1] 라이선스 목록 페이지 (GET /licenses)**
- [ ] 계층 구조 시각화
  - 상위 라이선스: 루트 레벨
  - 하위 라이선스: 들여쓰기 + 아이콘 (└─)
  - 예시:
    ```
    Open VPN
    └─ Domain1.com
    └─ Domain2.com
    Figma
    └─ Full
    └─ Dev
    ```

**[2] 라이선스 편집 페이지 (/licenses/[id]/edit)**
- [ ] "상위 라이선스" 드롭다운 추가
  - 선택 가능한 상위 라이선스 목록
  - "없음" 옵션 (루트)
  - 자신을 부모로 선택 불가 (비활성화)

**[3] 라이선스 상세 페이지 (/licenses/[id])**
- [ ] 하위 라이선스 섹션
  - 있으면: "관련 라이선스" 섹션에 테이블로 표시
  - 없으면: 숨김

**[4] CSV 템플릿 다운로드**
- [ ] 라이선스 CSV 헤더: `parentLicenseName` 컬럼 추가
- [ ] 샘플 행: 계층 구조 예시 포함

#### 완료 조건
- [ ] 목록: 계층 구조 정상 렌더링
- [ ] 편집: parentId 드롭다운 정상 작동
- [ ] 상세: 하위 라이선스 표시
- [ ] CSV 템플릿: parentLicenseName 컬럼 추가
- [ ] 스타일: Tailwind 일관성 유지

#### 기술 사항
- **파일**:
  - `app/licenses/page.tsx`
  - `app/licenses/[id]/page.tsx`
  - `app/licenses/[id]/edit/page.tsx`
  - 트리 렌더링 유틸 (필요 시 신규)

#### 종속성
- BE-040 (API 수정 완료)

---

## 📚 참고 문서

- `tasks/VISION.md` — 최종 목표 및 Phase별 로드맵
- `tasks/features/asset-management.md` — 자산 관리 상세 스펙
- `tasks/features/license-hierarchy.md` — 라이선스 계층 구조 스펙
- `tasks/current-state.md` — 현재 프로젝트 상태

---

**Phase 2~3-1 모두 완료. Phase 4 잔여 마무리 후 Phase 5로 진행합니다.**

---

## 🔴 Phase 4 잔여 — 즉시 처리

> **상태**: 오픈 (2026-03-12)
> Phase 4 마무리를 위한 잔여 작업

---

### [FE-060] /contracts — 업체 계약 전용 페이지

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟢 낮음 (1-2일)
**상태**: 🔴 오픈

#### 배경
- 사이드바에 `/contracts` 링크가 있으나 전용 페이지가 없음
- DB에 `Asset.type = "CONTRACT"` + `ContractDetail` 모델 완비
- API는 `/api/assets` 엔드포인트로 `type=CONTRACT` 필터링 가능
- `/hardware`, `/cloud`, `/domains` 페이지와 동일한 패턴

#### 요구사항
- [ ] `/app/contracts/page.tsx` 생성
- [ ] 계약 목록 표시 (GET /api/assets?type=CONTRACT)
- [ ] 계약 등록 모달/페이지 (POST /api/assets)
- [ ] 계약별 상세 필드: 계약 유형, 거래처, 자동갱신 여부
- [ ] 기존 `/hardware`, `/cloud`, `/domains` 페이지와 UI 일관성 유지

#### 완료 조건
- [ ] 계약 목록 페이지 정상 렌더링
- [ ] CRUD 정상 동작
- [ ] 사이드바 링크 동작 확인

#### 종속성
- 없음 (BE/DB 모두 완비)

---

### [BE-P3-03] 목록 API 페이지네이션 추가

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟡 중간 (2-3일)
**상태**: 🔴 오픈

#### 배경
- 현재 `/api/history`만 페이지네이션 지원
- 데이터 증가 시 `/api/licenses`, `/api/assets`, `/api/assignments`, `/api/groups` 성능 저하 우려
- `/api/assets`는 이미 `skip`, `take` 파라미터 정의됨 (TICKETS.md BE-021)

#### 요구사항
- [ ] `GET /api/licenses` — `skip`, `take`, `total` 응답 추가
- [ ] `GET /api/assignments` — `skip`, `take`, `total` 응답 추가
- [ ] `GET /api/groups` — `skip`, `take`, `total` 응답 추가
- [ ] `GET /api/employees` — `skip`, `take`, `total` 응답 추가
- [ ] 하위호환: 파라미터 미전달 시 기존과 동일하게 전체 반환

#### 완료 조건
- [ ] 4개 API 페이지네이션 정상 작동
- [ ] 기존 프론트엔드 동작 영향 없음 (하위호환)

---

### [OPS-020] Google Drive OAuth 환경변수 설정

**담당**: DevOps / 사람
**우선순위**: 🟡 중간
**난이도**: 🟢 낮음
**상태**: ⏳ 대기 (사람이 직접 실행)

#### 요구사항
- [ ] Google Cloud Console에서 Service Account 생성
- [ ] `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` 발급
- [ ] docker-compose.yml 또는 `.env` 파일에 설정
- [ ] 증적 Export 기능 테스트

---

### [OPS-021] EC2 배포

**담당**: DevOps / 사람
**우선순위**: 🟡 중간
**난이도**: 🟢 낮음
**상태**: ⏳ 대기 (사람이 직접 실행)

#### 요구사항
- [ ] `deploy.ps1` 실행 (git push + S3 업로드)
- [ ] EC2 SSM 접속 후 Docker 배포
- [ ] DB 스키마 동기화 (`npx prisma db push`)
- [ ] 기본 동작 확인 (로그인, CRUD, 대시보드)

---

## 🟢 Phase 5 — 운영 품질 개선 (신규)

> **상태**: 오픈 (2026-03-12)
> **배경**: Phase 1~4 달성률 95%로 80% 기준 초과. 추가 목표 수립.
> **목표**: 운영 안정성, 사용자 경험, 데이터 품질 강화
> **기간**: 3-4주

---

### [FE-070] 통합 검색 기능

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (3-4일)
**상태**: 🔴 오픈

#### 배경
- 현재 각 페이지별로 독립적인 검색만 가능
- 사용자가 자산명, 라이선스명, 조직원명을 통합 검색할 수 있어야 함

#### 요구사항
- [ ] 상단 네비게이션바에 통합 검색 입력창 추가
- [ ] 검색 결과를 유형별로 그룹화 (라이선스 / 자산 / 조직원)
- [ ] 검색 결과 클릭 시 해당 상세 페이지로 이동
- [ ] 디바운스 적용 (300ms)

#### 종속성
- BE-070 (통합 검색 API) 또는 클라이언트 사이드 검색

---

### [BE-070] 데이터 Export 통합 API

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟡 중간 (2-3일)
**상태**: 🔴 오픈

#### 배경
- 현재 월별 보고서 Excel Export만 존재
- 전체 자산(라이선스+자산+조직원)을 한 번에 Excel로 내보낼 수 있어야 함

#### 요구사항
- [ ] `GET /api/export/all?format=xlsx` — 전체 자산 Excel
  - Sheet 1: 라이선스 목록
  - Sheet 2: 자산 목록 (HW/Cloud/Domain/Contract)
  - Sheet 3: 조직원 목록
  - Sheet 4: 비용 요약
- [ ] `GET /api/export/all?format=csv` — CSV 내보내기
- [ ] 데이터 정합성: 환율 적용, VAT 계산 포함

---

### [FE-071] 대시보드 자산 통합 표시

**담당**: Frontend Role
**우선순위**: 🔴 Critical
**난이도**: 🟡 중간 (2-3일)
**상태**: 🔴 오픈

#### 배경
- 현재 대시보드는 주로 라이선스 데이터 중심
- HW/Cloud/Domain/Contract 자산도 대시보드에 통합 표시 필요

#### 요구사항
- [ ] 대시보드 상단 KPI에 전체 자산 수, 전체 월간 비용 추가
- [ ] 자산 유형별 분포 차트 (파이/도넛)
- [ ] 만료 임박 자산 위젯 (라이선스 + 자산 통합)
- [ ] 월별 총 비용 추이 (라이선스 + 자산 합산)

---

### [BE-071] 감사 로그 검색·필터 강화

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟢 낮음 (1-2일)
**상태**: 🔴 오픈

#### 배경
- `/api/history`에 페이지네이션은 있지만 세부 필터링 부족
- ISMS-P 감사 대비 특정 기간/유형/사용자별 조회 필요

#### 요구사항
- [ ] 날짜 범위 필터 (`from`, `to`)
- [ ] 액션 유형 필터 (`action`: CREATED, UPDATED, DELETED 등)
- [ ] 엔티티 유형 필터 (`entityType`: LICENSE, ASSET, EMPLOYEE 등)
- [ ] 행위자 필터 (`actor`)
- [ ] 프론트엔드 필터 UI 연동 (FE 별도 티켓)

---

### [BE-072] 자산-라이선스 연결 기능

**담당**: Backend Role
**우선순위**: 🟠 높음
**난이도**: 🟡 중간 (2-3일)
**상태**: 🔴 오픈

#### 배경
- 현재 License와 Asset이 독립적으로 관리됨
- 실제 운영에서는 라이선스가 특정 자산(서버, PC)에 설치되는 관계 필요
- ISO27001 자산-소프트웨어 매핑 증적에 필요

#### 요구사항
- [ ] `AssetLicenseLink` 모델 추가 (M:N 관계)
- [ ] `POST /api/assets/[id]/licenses` — 자산에 라이선스 연결
- [ ] `DELETE /api/assets/[id]/licenses/[licenseId]` — 연결 해제
- [ ] 자산 상세 API에 연결된 라이선스 목록 포함
- [ ] 라이선스 상세 API에 설치된 자산 목록 포함

---

### [FE-072] 알림 센터 UI

**담당**: Frontend Role
**우선순위**: 🟡 중간
**난이도**: 🟡 중간 (2-3일)
**상태**: 🔴 오픈

#### 배경
- 만료 알림, 갱신 알림이 Slack/Email로만 발송됨
- 웹 UI 내에서도 알림 확인 가능해야 함

#### 요구사항
- [ ] 상단 네비게이션에 알림 아이콘 (벨) 추가
- [ ] 알림 드롭다운: 최근 알림 목록
- [ ] 알림 유형: 만료 임박, 갱신 필요, 상태 변경
- [ ] 읽음/안읽음 상태 관리
- [ ] 알림 클릭 시 해당 자산/라이선스 상세로 이동

#### 종속성
- BE 알림 저장 API 필요 (별도 티켓)

---

### [FE-073] 반응형 모바일 최적화

**담당**: Frontend Role
**우선순위**: 🟡 중간
**난이도**: 🟡 중간 (3-4일)
**상태**: 🔴 오픈

#### 배경
- 현재 데스크톱 중심 UI
- 모바일에서 조회 시 테이블 가독성 저하

#### 요구사항
- [ ] 사이드바: 모바일에서 슬라이드 메뉴로 변환
- [ ] 테이블: 모바일에서 카드 뷰로 전환
- [ ] 폼: 모바일 최적화 (입력 필드 크기, 버튼 배치)
- [ ] 대시보드: 모바일 레이아웃 최적화

---

### [SEC-010] 보안 감사 2차 리뷰

**담당**: Security Role
**우선순위**: 🟠 높음
**난이도**: 🟡 중간 (2일)
**상태**: 🔴 오픈

#### 배경
- Phase 4에서 대량의 코드가 추가됨 (증적, 환율, 배치 등)
- Phase 1 이후 보안 리뷰 미실시
- ISMS-P 2차 감사 대비

#### 요구사항
- [ ] Phase 4 API (증적/환율/카테고리) RBAC 검증
- [ ] 배치 작업 (`/api/cron/*`) 인증 체계 확인
- [ ] 파일 업로드/다운로드 보안 검토 (Archive Export)
- [ ] 신규 모델 개인정보 항목 확인
- [ ] `tasks/security/review-2026-03-12.md` 결과 기록

---

### [OPS-030] 헬스체크 + 모니터링 엔드포인트

**담당**: DevOps Role
**우선순위**: 🟡 중간
**난이도**: 🟢 낮음 (1일)
**상태**: 🔴 오픈

#### 배경
- Docker 컨테이너 헬스체크 설정 없음
- 운영 중 장애 감지 어려움

#### 요구사항
- [ ] `GET /api/health` — 앱 상태 확인 (DB 연결 포함)
- [ ] `docker-compose.yml` healthcheck 설정 추가
- [ ] 응답: `{ status: "ok", db: "connected", uptime: 12345 }`

---

## 📋 Phase 5 종합 테이블

| 티켓 | Role | 우선순위 | 난이도 | 상태 | 예상 기간 |
|------|------|---------|--------|------|----------|
| FE-060 | Frontend | 🔴 Critical | 🟢 낮음 | 🔴 오픈 | 1-2일 |
| BE-P3-03 | Backend | 🟠 높음 | 🟡 중간 | 🔴 오픈 | 2-3일 |
| OPS-020 | DevOps/사람 | 🟡 중간 | 🟢 낮음 | ⏳ 대기 | - |
| OPS-021 | DevOps/사람 | 🟡 중간 | 🟢 낮음 | ⏳ 대기 | - |
| FE-070 | Frontend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 3-4일 |
| FE-071 | Frontend | 🔴 Critical | 🟡 중간 | 🔴 오픈 | 2-3일 |
| BE-070 | Backend | 🟠 높음 | 🟡 중간 | 🔴 오픈 | 2-3일 |
| BE-071 | Backend | 🟠 높음 | 🟢 낮음 | 🔴 오픈 | 1-2일 |
| BE-072 | Backend | 🟠 높음 | 🟡 중간 | 🔴 오픈 | 2-3일 |
| FE-072 | Frontend | 🟡 중간 | 🟡 중간 | 🔴 오픈 | 2-3일 |
| FE-073 | Frontend | 🟡 중간 | 🟡 중간 | 🔴 오픈 | 3-4일 |
| SEC-010 | Security | 🟠 높음 | 🟡 중간 | 🔴 오픈 | 2일 |
| OPS-030 | DevOps | 🟡 중간 | 🟢 낮음 | 🔴 오픈 | 1일 |

**Phase 5 총 예상 기간**: 3-4주 (병렬 작업 시)

---

## 🎯 Phase 5 진행 순서 (권장)

### Week 1: Phase 4 잔여 마무리 + 핵심 기능
1. **FE-060**: /contracts 페이지 (Phase 4 잔여)
2. **BE-P3-03**: 페이지네이션 추가
3. **SEC-010**: 보안 2차 리뷰 (병렬)

### Week 2: 대시보드 + 검색
4. **FE-071**: 대시보드 자산 통합
5. **FE-070**: 통합 검색 기능
6. **BE-071**: 감사 로그 필터 강화

### Week 3: 데이터 연결 + Export
7. **BE-072**: 자산-라이선스 연결
8. **BE-070**: 데이터 Export 통합 API
9. **OPS-030**: 헬스체크 엔드포인트

### Week 4: UX + 알림
10. **FE-072**: 알림 센터 UI
11. **FE-073**: 반응형 모바일 최적화

---

## 📚 참고 문서

- `tasks/VISION.md` — 최종 목표 및 Phase별 로드맵
- `tasks/features/asset-management.md` — 자산 관리 상세 스펙
- `tasks/features/license-hierarchy.md` — 라이선스 계층 구조 스펙
- `tasks/current-state.md` — 현재 프로젝트 상태
