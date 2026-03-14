# 정보자산 통합관리 플랫폼으로의 진화 전략

> **목표**: Asset Manager → Information Asset Management Platform으로 점진적 진화
>
> **원칙**:
> - 기존 라이선스 시스템 보존 (throw away ❌)
> - 최소 간섭 증분 진화 (incremental evolution)
> - ISMS-P / ISO27001 준수
>
> **작성일**: 2026-03-07
> **상태**: Architecture Design Phase

---

## 📊 현재 상태 분석

### 기존 시스템 (현재)
- **DB 모델**: License (소프트웨어 라이선스) 중심
- **UI**: 라이선스 목록, 조직원, 조직도, 대시보드
- **메타데이터**: name, type, cost, purchaseDate, expiryDate, owners, renewalStatus 등
- **추적**: 할당(Assignment), 갱신(LicenseRenewalHistory), 감사(AuditLog)
- **리포팅**: CSV 임포트, 단순 대시보드

### 문제점
- **자산 타입 제한**: 라이선스만 관리 가능
- **UI 복잡도**: 모든 것이 한 시스템에 혼재
- **확장성**: 새로운 자산 타입 추가 어려움
- **대시보드**: 통합 뷰 부재

### 보존할 가치 있는 부분
- ✅ 세션 기반 인증 (bcrypt + 쿠키)
- ✅ 역할 기반 접근제어 (ADMIN / USER)
- ✅ 감사 로그 시스템 (AuditLog)
- ✅ 조직 계층 (OrgUnit 트리)
- ✅ 할당 추적 (Assignment)
- ✅ Prisma ORM + PostgreSQL/Supabase

---

## 🏗️ 아키텍처 진화 전략

### 1️⃣ 핵심: Asset 추상화

#### 기존 모델 (License 중심)
```
License
├─ name, type (KEY_BASED, VOLUME, NO_KEY)
├─ cost, purchaseDate, expiryDate
├─ renewalStatus, renewalDate
├─ owners (LicenseOwner)
└─ assignments (Assignment)
```

#### 진화된 모델 (Asset 중심)
```
Asset (기본 추상화 - 모든 자산 타입의 상위)
├─ id, name, type (enum: SOFTWARE, HARDWARE, CLOUD, WEB_APP, DOMAIN_SSL, OTHER)
├─ category (카테고리)
├─ status (ACTIVE, INACTIVE, DISPOSED, RETIRED)
├─ cost, vendor, purchaseDate, expiryDate
├─ owner (Employee)
├─ department / orgUnit
├─ tags, description
├─ metadata (JSON - 유형별 추가정보)
├─ createdAt, updatedAt
│
├─ SoftwareLicense (Asset의 특화)
│   ├─ licenseType, licenseKey
│   ├─ seat / quantity
│   ├─ renewalDate, renewalStatus
│   └─ holders (Assignment)
│
├─ ITDevice (Asset의 특화)
│   ├─ manufacturer, model, serialNumber
│   ├─ specs (CPU, RAM, SSD)
│   ├─ location, assignedTo (Employee)
│   └─ condition (NEW, GOOD, FAIR, POOR, EOL)
│
├─ CloudAsset (Asset의 특화)
│   ├─ provider (AWS, Azure, GCP, Slack, etc)
│   ├─ accountId, region
│   ├─ serviceType, resourceCount
│   └─ billingContact
│
├─ WebAppAsset (Asset의 특화)
│   ├─ serviceUrl, environment (PROD, STAGING, DEV)
│   ├─ owner (team/person)
│   ├─ operationalStatus (RUNNING, MAINTENANCE, DEPRECATED)
│   └─ dependencies
│
├─ DomainSSLAsset (Asset의 특화)
│   ├─ domainName
│   ├─ registrar, registrationDate
│   ├─ dnsProvider, ipAddress
│   └─ sslCertificateExpiry, certificateProvider
│
└─ Tags, History, Assignments 등 공통 추적
```

### 2️⃣ 데이터 모델 진화 전략

#### Phase 1: 준비 (현재 - Supabase 전환 완료)
```prisma
// 현재: License 모델 유지
// Supabase PostgreSQL 기반 구축
// AuditLog, Employee, OrgUnit 확립
```

#### Phase 2: Asset 추상화 도입
```prisma
enum AssetType {
  SOFTWARE      // 기존 License
  HARDWARE      // PC, 노트북, 모니터, 서버
  CLOUD         // AWS, Azure, SaaS
  WEB_APP       // 내부 웹앱, 서비스
  DOMAIN_SSL    // 도메인, SSL 인증서
  OTHER         // 기타 정보자산
}

enum AssetStatus {
  ACTIVE        // 운영 중
  INACTIVE      // 비활성
  DEPRECATED    // 만료/폐지됨
  RETIRED       // 폐기됨
}

model Asset {
  id                Int       @id @default(autoincrement())
  name              String    @unique
  type              AssetType
  category          String?   // 사용자 정의 카테고리
  status            AssetStatus @default(ACTIVE)

  // 공통 메타데이터
  cost              Float?
  currency          Currency  @default(KRW)
  vendor            String?
  purchaseDate      DateTime?
  expiryDate        DateTime?

  // 소유권
  ownerUserId       Int?
  ownerOrgUnitId    Int?
  departmentId      Int?

  // 추적
  tags              String[]  // [tag1, tag2]
  description       String?
  metadata          Json?     // 유형별 추가 정보

  // 타임스탬프
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime? // soft delete

  // 관계
  owner             User?     @relation(fields: [ownerUserId], references: [id], onDelete: SetNull)
  ownerDepartment   OrgUnit?  @relation(fields: [ownerOrgUnitId], references: [id], onDelete: SetNull)
  assignments       Assignment[]
  auditLogs         AuditLog[]
  histories         AssetHistory[]

  @@index([type, status])
  @@index([expiryDate])
  @@index([ownerUserId, ownerOrgUnitId])
}

// 소프트웨어 라이선스 (Asset의 특화)
model SoftwareLicense {
  id                Int       @id @default(autoincrement())
  assetId           Int       @unique
  asset             Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  licenseKey        String?
  licenseType       LicenseType  // KEY_BASED, VOLUME, NO_KEY
  totalQuantity     Int
  availableQuantity Int?
  renewalStatus     RenewalStatus @default(BEFORE_RENEWAL)
  renewalDate       DateTime?
  renewalDateManual DateTime?
  renewalHistory    LicenseRenewalHistory[]
}

// IT 장비 (Asset의 특화)
model ITDevice {
  id                Int       @id @default(autoincrement())
  assetId           Int       @unique
  asset             Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  manufacturer      String?
  model             String?
  serialNumber      String?
  specifications    String?   // CPU, RAM, SSD 정보
  location          String?
  condition         String?   // NEW, GOOD, FAIR, POOR, EOL
  assignedEmployeeId Int?
  assignedEmployee  Employee? @relation(fields: [assignedEmployeeId], references: [id])
}

// 클라우드 자산 (Asset의 특화)
model CloudAsset {
  id                Int       @id @default(autoincrement())
  assetId           Int       @unique
  asset             Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  provider          String    // AWS, Azure, GCP, Slack, etc
  accountId         String?
  region            String?
  serviceType       String?
  resourceCount     Int?
  billingContact    String?
  monthlyCost       Float?
}

// 웹/앱 서비스 (Asset의 특화)
model WebAppAsset {
  id                Int       @id @default(autoincrement())
  assetId           Int       @unique
  asset             Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  serviceUrl        String?
  environment       String    // PROD, STAGING, DEV
  operationalStatus String    // RUNNING, MAINTENANCE, DEPRECATED
  ownerTeam         String?
  dependencies      String[]  // JSON array
}

// 도메인 / SSL (Asset의 특화)
model DomainSSLAsset {
  id                Int       @id @default(autoincrement())
  assetId           Int       @unique
  asset             Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  domainName        String
  registrar         String?
  registrationDate  DateTime?
  dnsProvider       String?
  ipAddress         String?
  certificateExpiry DateTime?
  certificateProvider String?
}

// 자산 이력 (변경 추적)
model AssetHistory {
  id                Int       @id @default(autoincrement())
  assetId           Int
  asset             Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  action            String    // CREATED, UPDATED, ASSIGNED, UNASSIGNED, RETIRED
  changedFields     Json?     // 변경된 필드 기록
  changedBy         Int?
  changedByUser     User?     @relation(fields: [changedBy], references: [id])

  createdAt         DateTime  @default(now())

  @@index([assetId, createdAt])
}
```

### 3️⃣ UI / 네비게이션 아키텍처

#### 기존 (라이선스 중심)
```
/
├─ /dashboard
├─ /licenses (라이선스만)
├─ /employees
├─ /org
├─ /history
└─ /admin
```

#### 진화된 (자산 중심, 카테고리 분리)
```
/
├─ /dashboard (통합 대시보드)
│  ├─ 전체 자산 요약
│  ├─ 카테고리별 분포
│  └─ 월별 비용 추이
│
├─ /assets (자산 통합 관리 - 새로운 진입점)
│  ├─ /assets (전체 자산 목록 + 필터)
│  │
│  └─ /assets/software (소프트웨어 라이선스)
│     ├─ 라이선스 목록
│     ├─ 라이선스 등록
│     ├─ 라이선스 상세
│     ├─ 라이선스 특화 대시보드 ⭐
│     └─ 갱신 일정
│
│  └─ /assets/devices (IT 장비)
│     ├─ 장비 목록
│     ├─ 장비 등록
│     ├─ 장비 상세
│     ├─ 장비 특화 대시보드 ⭐
│     └─ 위치별 분포
│
│  └─ /assets/cloud (클라우드)
│     ├─ 클라우드 자산 목록
│     ├─ 클라우드 자산 등록
│     ├─ 클라우드 자산 상세
│     ├─ 클라우드 특화 대시보드 ⭐
│     └─ 비용 분석
│
│  └─ /assets/web-app (웹/앱)
│     ├─ 서비스 목록
│     ├─ 서비스 등록
│     ├─ 서비스 상세
│     ├─ 서비스 특화 대시보드 ⭐
│     └─ 운영 상태
│
│  └─ /assets/domains (도메인/SSL)
│     ├─ 도메인 목록
│     ├─ 도메인 등록
│     ├─ 도메인 상세
│     ├─ 도메인 특화 대시보드 ⭐
│     └─ 갱신 일정
│
│  └─ /assets/other (기타)
│     └─ 구조는 동일
│
├─ /reports (보고서 및 내보내기)
│  ├─ /reports/monthly (월별 종합 보고서)
│  ├─ /reports/cost (비용 분석)
│  ├─ /reports/expiration (만료 일정)
│  └─ /reports/export (Excel/CSV 내보내기)
│
├─ /employees (조직원 관리)
├─ /org (조직도)
├─ /history (감사 로그)
│
├─ /admin (관리자 페이지)
│  ├─ /admin/users (사용자 관리)
│  ├─ /admin/categories (카테고리 관리) ⭐ NEW
│  ├─ /admin/asset-settings (자산 설정) ⭐ NEW
│  └─ /admin/compliance (준수 설정) ⭐ NEW (Phase 5)
│
└─ /policies (정책 & 문서) ⭐ NEW (Phase 5)
   ├─ /policies/list
   ├─ /policies/create
   └─ /policies/[id]
```

#### 사이드바 구조
```
┌─────────────────────┐
│  Asset Manager    │
│  (또는 Asset Hub)   │
├─────────────────────┤
│ 📊 대시보ード       │
│ 📦 자산             │
│   ├─ 소프트웨어    │
│   ├─ 장비          │
│   ├─ 클라우드      │
│   ├─ 웹/앱         │
│   ├─ 도메인/SSL    │
│   └─ 기타          │
│ 📋 보고서           │
│ 👥 조직원           │
│ 🏢 조직도           │
│ 📜 정책 (Future)    │
│ ⚙️ 설정             │
│ 📊 감사로그         │
└─────────────────────┘
```

---

## 📈 대시보드 설계 전략

### 계층 구조

#### L1: 통합 대시보드 (`/dashboard`)
```
┌─ 전체 자산 요약 카드
│  ├─ 자산 총 개수
│  ├─ 월간 총비용
│  ├─ 만료 임박 (30일)
│  └─ 상태별 분포
│
├─ 자산 타입별 분포 (Pie Chart)
│  ├─ SOFTWARE: 45개 (₩200M)
│  ├─ CLOUD: 30개 (₩180M)
│  ├─ HARDWARE: 35개 (₩100M)
│  ├─ WEB_APP: 20개 (₩50M)
│  ├─ DOMAIN_SSL: 10개 (₩20M)
│  └─ OTHER: 5개 (₩10M)
│
├─ 월별 비용 추이 (Line Chart - 12개월)
│
├─ 부서별 비용 분포 (Bar Chart)
│
├─ 만료 일정 (Timeline)
│  └─ 다음 30일 내 만료 예정 자산 나열
│
└─ 빠른 통계
   ├─ 갱신 대기 중
   ├─ 미할당 자산
   └─ 폐기 예정
```

#### L2: 카테고리별 대시보드 (각 `/assets/{category}` 페이지에 내장)

**소프트웨어 카테고리**
```
Metric Cards:
- 라이선스 수
- 할당된 시트 수
- 연간 비용
- 갱신 임박 (D-70)
- 미할당

차트:
- 라이선스 타입 분포 (KEY_BASED / VOLUME / NO_KEY)
- 갱신 일정 (월별)
- 비용 추이

테이블:
- 라이선스 목록 (이름, 타입, 만료일, 비용)
```

**IT 장비 카테고리**
```
Metric Cards:
- 장비 수
- 할당된 / 여유
- 평균 수명
- EOL 임박
- 위치별 분포

차트:
- 위치별 분포 (지도 또는 막대)
- 제조사별 분포
- 상태별 분포 (NEW, GOOD, FAIR, POOR, EOL)
- 연령 분포 (구매 연도별)

테이블:
- 장비 목록 (모델, 위치, 할당자, 상태)
```

**클라우드 카테고리**
```
Metric Cards:
- 구독 수
- 월간 비용
- 사용 중인 리소스
- 좌석부족 경고
- 미청구 계정

차트:
- 서비스 제공자별 비용 (AWS / Azure / GCP / Slack 등)
- 서비스별 월간 비용 (Trend)
- 계정별 비용 분포

테이블:
- 클라우드 자산 목록 (제공자, 계정, 월간비용, 담당자)
```

**웹/앱 카테고리**
```
Metric Cards:
- 서비스 수
- PROD / STAGING / DEV 분포
- 운영 상태 분포
- 담당팀

테이블:
- 서비스 목록 (URL, 환경, 상태, 담당팀, 종속성)
```

**도메인/SSL 카테고리**
```
Metric Cards:
- 도메인 수
- SSL 인증서 수
- 만료 임박 (30일)
- 갱신 비용 (연간)

테이블:
- 도메인 목록 (도메인, 등록자, 만료일)
- SSL 인증서 목록 (도메인, 제공자, 만료일)
```

---

## 📊 보고서 & 내보내기 아키텍처

### 월별 보고서 구조

**레포트 페이지 (`/reports/monthly`)**
```
┌─ 기간 선택 (월)
│  └─ [2026-02 ▼] [생성] [다운로드]
│
├─ 📋 Executive Summary
│  ├─ 자산 총 개수
│  ├─ 월간 총비용
│  ├─ 신규 추가 자산
│  ├─ 폐기된 자산
│  └─ 변동 비용
│
├─ 📦 자산 타입별 집계
│  ├─ SOFTWARE: 45개 @ ₩200M
│  ├─ CLOUD: 30개 @ ₩180M
│  ├─ HARDWARE: 35개 @ ₩100M
│  └─ ...기타
│
├─ 📈 부서별 비용 분석
│  ├─ 개발팀: ₩250M (50%)
│  ├─ 영업팀: ₩150M (30%)
│  └─ 관리팀: ₩100M (20%)
│
├─ 📝 주요 변동사항
│  ├─ [신규] AWS 계정 추가 (+₩30M)
│  ├─ [삭제] 구형 서버 폐기 (-₩8M)
│  └─ [갱신] Slack Pro 업그레이드 (+₩2M)
│
└─ [Excel 내보내기] [PDF] [이메일 공유]
```

### Excel 내보내기 구조 (4개 시트)

**Sheet 1: 자산 현황**
```
| Asset ID | Name | Type | Category | Status | Owner | Department | Cost | Vendor | PurchaseDate | ExpiryDate | Tags | LastModified |
|----------|------|------|----------|--------|-------|------------|------|--------|--------------|-----------|------|--------------|
```

**Sheet 2: 자산 변동 이력**
```
| Date | Asset | Action | OldValue | NewValue | ChangedBy | Reason |
|------|-------|--------|----------|----------|-----------|--------|
```

**Sheet 3: 비용 요약 (by 타입)**
```
| Type | Count | UnitCost | TotalCost | Currency | MonthlyAvg | YearlyProjection |
|------|-------|----------|-----------|----------|------------|------------------|
```

**Sheet 4: 부서별 비용 분석**
```
| Department | SoftwareCost | CloudCost | DeviceCost | OtherCost | Total | Budget | Variance |
|------------|--------------|-----------|-----------|----------|-------|--------|----------|
```

### API 아키텍처

```
GET  /api/reports/monthly?month=2026-02
     → { summary, byType, byDepartment, changes }

GET  /api/reports/monthly/export?month=2026-02&format=xlsx
     → Binary Excel file

GET  /api/reports/cost-trend?months=12
     → Monthly cost trend for chart

GET  /api/dashboard/by-category?type=software
     → Category-specific dashboard data

GET  /api/assets?type=software&status=active
     → Asset list with filtering/pagination
```

---

## 🔄 점진적 진화: 5단계 로드맵

### Phase 1: 기초 안정화 ✅ (현재 - 완료)
**목표**: Supabase 전환, 기존 라이선스 시스템 안정화

**작업**:
- [x] Supabase PostgreSQL 전환
- [x] 감사 로그 시스템 강화
- [x] 입력 검증 추가
- [x] 성능 최적화

**결과**: 견고한 라이선스 관리 시스템 + PostgreSQL 기반

---

### Phase 2: Asset 추상화 (3-4주)
**목표**: License → Asset 모델로 일반화, 첫 번째 카테고리 확장

**데이터베이스 변경**:
- [ ] Asset 테이블 생성 (base model)
- [ ] SoftwareLicense 테이블 (Asset 특화)
- [ ] ITDevice 테이블 (Asset 특화)
- [ ] AssetHistory 테이블 (변경 추적)
- [ ] 기존 License 데이터 → Asset/SoftwareLicense로 마이그레이션

**API 구현**:
- [ ] `GET|POST|PUT|DELETE /api/assets`
- [ ] `GET|POST|PUT|DELETE /api/assets/software`
- [ ] `GET|POST|PUT|DELETE /api/assets/devices`
- [ ] `GET /api/assets?type=software&status=active` (필터링)

**UI 변경**:
- [ ] `/assets` 페이지 생성 (전체 자산 목록)
- [ ] `/assets/software` 페이지 (라이선스 → 자산으로 전환)
- [ ] `/assets/devices` 페이지 (IT 장비 관리)
- [ ] 사이드바 업데이트 (자산 > 소프트웨어, 자산 > 장비)

**마이그레이션 전략**:
```sql
-- Phase 2 진행 중:
-- 기존 /licenses는 유지
-- 새로운 /assets/software는 Asset 모델 사용
-- 사용자는 두 곳 모두 접근 가능 (읽기 전용 또는 마이그레이션 안내)

-- Phase 2 완료 후:
-- 기존 License 데이터를 Asset으로 완전 마이그레이션
-- /licenses → /assets/software로 리다이렉트
-- License 테이블 deprecated 처리 (DROP 금지)
```

**보존/변경**:
- ✅ 보존: 기존 License 엔티티 (읽기 전용, 동기화)
- ✅ 보존: LicenseRenewalHistory, LicenseOwner, Assignment
- 🔄 변경: UI를 Asset 기반으로 재설계
- 🔄 API: 기존 `/api/licenses` + 새로운 `/api/assets` 병행

---

### Phase 3: 자산 확장 + 통합 대시보드 (3-4주)
**목표**: 모든 자산 카테고리 추가, 카테고리별 + 통합 대시보드

**자산 카테고리 추가**:
- [ ] CloudAsset (AWS, Azure, GCP, SaaS)
- [ ] WebAppAsset (서비스, URL, 환경)
- [ ] DomainSSLAsset (도메인, SSL 인증서)

**API 구현**:
- [ ] Cloud assets CRUD
- [ ] Web app assets CRUD
- [ ] Domain/SSL assets CRUD

**UI 구현**:
- [ ] `/assets/cloud` 페이지
- [ ] `/assets/web-app` 페이지
- [ ] `/assets/domains` 페이지
- [ ] 각 카테고리별 특화 대시보드

**대시보드 통합**:
- [ ] `/dashboard` 개편 (통합 뷰)
  - 전체 자산 요약
  - 카테고리별 분포
  - 월별 비용 추이
  - 부서별 분석
  - 만료 일정

**보고서 & 내보내기**:
- [ ] `/reports/monthly` 페이지
- [ ] Excel/CSV 내보내기 (4개 시트)
- [ ] 비용 분석 리포트
- [ ] 변동 이력 리포트

---

### Phase 4: 정보자산 증적 시스템 (2-3주)
**목표**: 월별 자동 증적, 구글드라이브 연동, ISO27001 준수

**구현**:
- [ ] ExchangeRate 동기화 (환율)
- [ ] Archive 배치 (매월 1일)
- [ ] Google Drive 통합 (OAuth)
- [ ] CSV/Excel 증적 파일 생성
- [ ] 변동 이력 추출 (AuditLog 기반)
- [ ] VAT 계산

**UI**:
- [ ] `/admin/archives` (증적 목록 및 수동 내보내기)
- [ ] 증적 상태 모니터링
- [ ] 기간 선택 캘린더

---

### Phase 5: 정책 & 준수 확장 (4-6주, 향후)
**목표**: 정책 문서, 감시 증거, ISO27001/ISMS-P 준수 아티팩트 관리

**미래 설계** (지금은 구현 ❌, 아키텍처만 예비):
```
새로운 도메인:
- Policy 모델 (정책 문서)
- ComplianceEvidence 모델 (감시 증거)
- ComplianceFramework (ISO27001, ISMS-P 등)
- PolicyDocument (Google Workspace 연동)

새로운 페이지:
- /policies (정책 목록)
- /policies/[id] (정책 상세)
- /compliance (준수 대시보드)
- /audit-artifacts (감시 증거)

API:
- GET|POST|PUT|DELETE /api/policies
- GET|POST|PUT|DELETE /api/compliance-evidence
```

**이 단계에서의 고려사항**:
- Asset, Report 아키텍처와의 연결
- Google Workspace API 통합
- 정책 버전 관리
- 승인 워크플로우

---

## 🎯 리팩토링 전략

### A. 지금 해야 할 것 (Phase 2)

**데이터베이스**:
- [ ] Asset 기본 테이블 생성 (License 병행 유지)
- [ ] SoftwareLicense, ITDevice 특화 테이블
- [ ] AssetHistory (변경 추적)

**API**:
- [ ] `/api/assets` CRUD 구현
- [ ] 기존 `/api/licenses`는 유지 (마이그레이션 기간)

**UI**:
- [ ] `/assets` 페이지 생성
- [ ] `/assets/software` (라이선스 관리로 리브랜딩)
- [ ] 사이드바 업데이트

**코드 품질**:
- [ ] lib/asset-helpers.ts (공통 유틸)
- [ ] lib/cost-calculator.ts (비용 계산 일반화)
- [ ] lib/history-tracker.ts (변경 추적 일반화)

---

### B. 연기해야 할 것

**Phase 5 이후**:
- ❌ Policy/Compliance 모델 (너무 이른 구현)
- ❌ 정책 문서 Google Drive 실시간 동기화 (복잡도 높음)
- ❌ 고급 분석 (Machine Learning 기반 비용 예측)

**따로 검토 필요**:
- ❓ 멀티 테넌시 (지금은 단일 조직 기준)
- ❓ 자산 간 의존성 그래프 (나중에)

---

### C. 과도 엔지니어링 피하기

**지금은 ❌ (나중에)**:
- ❌ 자산 승인 워크플로우 (Phase 4까지는 관리자 add only)
- ❌ 자산 요청 포탈 (나중에 필요하면)
- ❌ 예측 분석 (먼저 정확한 데이터 수집)
- ❌ 실시간 비용 모니터링 (월별로 충분)
- ❌ 복잡한 권한 모델 (현재 ADMIN/USER로 충분)

**간단한 버전부터**:
- ✅ 기본 자산 CRUD + 필터링
- ✅ 월별 정적 리포트
- ✅ 기본 대시보드 (차트)
- ✅ 간단한 태그 시스템

---

## 🏗️ 아키텍처 원칙

### 1. 확장성 우선
- **Asset as base**: 모든 자산 타입이 Asset을 상속
- **메타데이터 JSON**: 유형별 추가 정보는 JSON 컬럼에
- **태그 시스템**: 유연한 분류 (enum 대신)

### 2. 기존 보존
- **License 테이블 유지**: 마이그레이션 기간 동기화
- **기존 API 유지**: `/api/licenses` → `/api/assets/software` 병행
- **기존 UI 점진적 전환**: 한 번에 모두 바꾸지 말 것

### 3. 점진적 진화
- **Phase별 독립**: 각 phase가 스스로 배포 가능
- **마이그레이션 도구**: License → Asset 자동 변환 스크립트
- **사용자 영향 최소화**: 중단 없는 업그레이드

### 4. 일관된 추적
- **감사 로그**: 모든 Asset 변경 기록
- **이력 테이블**: AssetHistory로 월별 스냅샷
- **할당 추적**: Assignment로 소유권 변경

### 5. 비용 투명성
- **공통 비용 모델**: 모든 자산은 cost, currency, vendor
- **월별 집계**: 카테고리별 + 전체 비용
- **환율 지원**: Phase 4에서 추가

---

## 📋 구현 체크리스트

### Phase 2 체크리스트

#### 데이터베이스
- [ ] Asset 테이블 정의
- [ ] SoftwareLicense 생성
- [ ] ITDevice 생성
- [ ] AssetHistory 생성
- [ ] Migration 파일 생성
- [ ] Prisma generate 실행
- [ ] License → Asset 동기화 로직

#### 백엔드 API
- [ ] `POST /api/assets` (생성)
- [ ] `GET /api/assets` (목록, 필터링)
- [ ] `GET /api/assets/[id]` (상세)
- [ ] `PUT /api/assets/[id]` (수정)
- [ ] `DELETE /api/assets/[id]` (삭제)
- [ ] `GET /api/assets/software` (카테고리별)
- [ ] AuditLog 통합
- [ ] AssetHistory 기록

#### 프론트엔드 UI
- [ ] `/assets` 페이지 (전체 목록)
- [ ] `/assets/new` (등록 폼)
- [ ] `/assets/[id]` (상세)
- [ ] `/assets/software` (라이선스)
- [ ] `/assets/devices` (장비)
- [ ] 사이드바 업데이트

#### 마이그레이션
- [ ] 테스트 환경에서 License → Asset 변환
- [ ] 롤백 계획 수립
- [ ] 사용자 알림 메시지

---

## 🔐 ISO27001 / ISMS-P 준수 고려사항

### 지금 준수
- ✅ 감사 로그 (모든 변경 기록)
- ✅ 역할 기반 접근제어 (RBAC)
- ✅ 암호화된 저장 (Supabase + TLS)
- ✅ 세션 관리

### Phase 2부터 추가
- [ ] 자산 분류 (정보자산 카테고리)
- [ ] 자산 상태 추적 (ACTIVE, DEPRECATED, RETIRED)
- [ ] 소유권 추적 (Asset.owner, Asset.department)
- [ ] 변경 이력 (AssetHistory)

### Phase 4부터 추가
- [ ] 월별 자산 스냅샷 (정보자산 증적)
- [ ] 엑셀 리포트 (감시 증거용)
- [ ] 체계적 분류 (카테고리별 대시보드)

### Phase 5에서 추가
- [ ] 정책 문서 관리
- [ ] 준수 체크리스트
- [ ] 감사 아티팩트

---

## 요약: 진화 경로

```
Phase 1 (완료)
↓
라이선스 중심 시스템 (Supabase 기반)
↓
Phase 2: Asset 추상화 + 첫 확장
↓
Asset 중심 시스템 (소프트웨어, 장비 관리)
↓
Phase 3: 모든 카테고리 + 통합 대시보드
↓
다중 자산 통합 플랫폼 (비용, 소유권, 만료 추적)
↓
Phase 4: 자동 증적 + 규정 준수
↓
정보자산 거버넌스 플랫폼 (월별 리포트, 자동 아카이빙)
↓
Phase 5: 정책 & 준수
↓
종합 정보자산 관리 플랫폼
(Asset + Report + Policy + Compliance in ONE)
```

---

## 최종 조언

### ✅ DO
1. **Asset 모델을 먼저 설계**: 모든 확장의 기초
2. **JSON 메타데이터 활용**: 고정 스키마 변경 최소화
3. **마이그레이션 도구 준비**: 사용자 데이터 손실 방지
4. **각 phase를 완전히 테스트**: 롤백 계획 필수
5. **사용자 피드백 수집**: 각 phase 완료 후

### ❌ DON'T
1. ❌ **License 테이블 즉시 삭제**: 마이그레이션 기간 필요
2. ❌ **모든 것을 한 번에 변경**: 단계별로 진행
3. ❌ **미래를 위해 과도 설계**: Phase 5는 아직 추측
4. ❌ **권한 모델 복잡화**: ADMIN/USER로 충분
5. ❌ **실시간 동기화**: 월별로 충분

---

## 리소스 예상

| Phase | 기간 | FTE | 주요 담당 |
|-------|------|-----|---------|
| Phase 2 | 3-4주 | 2 | Backend + Frontend |
| Phase 3 | 3-4주 | 2 | Backend + Frontend |
| Phase 4 | 2-3주 | 2 | Backend (비동기 배치) |
| Phase 5 | 4-6주 | 2+ | Backend + Frontend + Design |

**총 12-18주** (3-4.5개월) for full implementation

---

## Next Steps

1. **Phase 2 설계 상세화**: DB 마이그레이션 경로
2. **팀 리뷰**: 아키텍처 동의 확인
3. **Phase 2 착수**: Asset 모델 구현 시작
