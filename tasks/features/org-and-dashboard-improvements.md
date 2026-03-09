# 조직 관리 및 대시보드 개선 스펙

> **목표**: 조직(Company) CRUD UI 완성 + 자산 카테고리 도입 + 대시보드 확장
> **예상 시기**: 배포 전/후 (우선순위 조정 중)
> **작성일**: 2026-03-07

---

## 1️⃣ 조직(Company) CRUD UI 추가

### 현황 분석
- ✅ **API 구현**: `POST /api/org/companies` (회사 생성) — 이미 구현됨
- ❌ **UI 부재**: org-tree.tsx에 회사 생성 버튼 없음
- **문제점**: 관리자가 조직도 UI에서 새로운 회사를 생성할 수 없음

### 필요한 변경

#### 1.1 Frontend (`role/frontend`)

**[FE-ORG-001]** `/org` 페이지 — 회사 생성·편집·삭제 UI 추가

```
조직도 페이지 레이아웃:

┌─────────────────────────────────┐
│ 조직도                [+ 새 회사] │  ← 생성 버튼 추가
├─────────────────────────────────┤
│                                 │
│ 회사 1 [✏️ 수정] [🗑️ 삭제]      │  ← 편집/삭제 버튼 추가
│  ├─ 부서 A                      │
│  ├─ 부서 B                      │
│                                 │
│ 회사 2 [✏️ 수정] [🗑️ 삭제]      │
│  ├─ 부서 X                      │
│                                 │
└─────────────────────────────────┘
```

**변경 사항:**
1. `org-tree.tsx`:
   - 회사 카드에 수정([✏️]) 버튼 추가
   - 회사 카드에 삭제([🗑️]) 버튼 추가

2. `org/page.tsx`:
   - 상단에 "새 회사 생성" 버튼 추가 (초기 모달 폼)
   - 회사 편집 모달 (이름 변경)
   - 회사 삭제 확인 모달

**모달 폼 사양:**

**회사 생성 모달:**
```
┌──────────────────────────────┐
│ 새 회사 생성                  │
├──────────────────────────────┤
│ 회사명: [____________]        │
│                              │
│       [취소]      [생성]      │
└──────────────────────────────┘
```

**회사 편집 모달:**
```
┌──────────────────────────────┐
│ 회사 정보 수정                │
├──────────────────────────────┤
│ 회사명: [____________]        │
│                              │
│       [취소]      [저장]      │
└──────────────────────────────┘
```

**회사 삭제 모달:**
```
┌──────────────────────────────┐
│ 회사 삭제                     │
├──────────────────────────────┤
│ "홍길동회사"를 삭제하시면:   │
│ • 소속 부서 5개 이동         │
│ • 영향 조직원 12명           │
│                              │
│ "삭제하겠습니다" 입력 필요   │
│ [________]                   │
│                              │
│       [취소]      [삭제]      │
└──────────────────────────────┘
```

#### 1.2 Backend (`role/backend`)

**[BE-ORG-001]** `PUT /api/org/companies/[id]` — 회사 이름 수정

```
요청:
  PUT /api/org/companies/1
  { "name": "신 회사명" }

응답 200:
  { "id": 1, "name": "신 회사명" }

응답 409:
  { "error": "이미 존재하는 회사명입니다." }
```

**[BE-ORG-002]** `DELETE /api/org/companies/[id]` — 회사 삭제

```
요청:
  DELETE /api/org/companies/1

응답 200:
  { "message": "회사가 삭제되었습니다." }

응답 409:
  { "error": "소속 부서가 있어 삭제할 수 없습니다." }
```

**주의:**
- 회사에 소속된 부서(OrgUnit)가 있으면 삭제 불가 (FK 제약)
- 먼저 부서 계층 이동 또는 삭제 필요
- AuditLog 기록 필수 (CREATED, UPDATED, DELETED)

---

## 2️⃣ 자산 카테고리 도입 (Phase 2 준비)

### 개념 정의

**현재:** 라이선스만 관리 (소프트웨어 라이선스)
**미래 (Phase 2):** 모든 정보자산 통합 관리

```
자산 (Asset)
├─ SOFTWARE      (기존 License → Asset으로 전환)
├─ CLOUD         (SaaS, 클라우드 구독)
├─ HARDWARE      (서버, 노트북, 모니터 등)
├─ DOMAIN_SSL    (도메인, SSL 인증서)
└─ OTHER         (기타 자산)
```

### Phase 2에서 구현할 내용

**[BE-020]** `prisma/schema.prisma` — Asset, HardwareDetail, CloudDetail 모델 추가

```prisma
model Asset {
  id           Int       @id @default(autoincrement())
  name         String    @unique
  type         AssetType              // SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
  status       AssetStatus @default(ACTIVE)  // ACTIVE, INACTIVE, DISPOSED
  cost         Float?
  purchaseDate DateTime
  expiryDate   DateTime?
  description  String?
  ownerOrgUnitId Int?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  hardwareDetail  HardwareDetail?
  cloudDetail     CloudDetail?
  assignments     Assignment[]
  auditLogs       AuditLog[]
}

model HardwareDetail {
  id        Int    @id @default(autoincrement())
  assetId   Int    @unique
  asset     Asset  @relation(fields: [assetId], references: [id], onDelete: Cascade)

  manufacturer String?
  model        String?
  serialNumber String?
  specs        String?     // CPU, RAM, SSD, etc
  location     String?     // 위치
}

model CloudDetail {
  id        Int    @id @default(autoincrement())
  assetId   Int    @unique
  asset     Asset  @relation(fields: [assetId], references: [id], onDelete: Cascade)

  platform      String    // AWS, Azure, GCP, Slack, etc
  accountId     String?
  region        String?
  seatCount     Int?      // 사용자 수 / 라이선스 수
  subscriptionTier String?
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

---

## 3️⃣ 대시보드 확장

### 3.1 현재 대시보드 (라이선스 전용)

**경로:** `/dashboard`

```
┌──────────────────────────────────────┐
│ 대시보드                              │
├──────────────────────────────────────┤
│ 📊 라이선스 현황 (Metric Cards)       │
│  • 전체: 45개  • 연간비용: ₩123M    │
│  • 30일내만료: 3개  • 90일내: 8개   │
│                                      │
│ 📈 월별 비용 추이 (Line Chart)       │
│                                      │
│ 🥧 라이선스 유형 분포 (Pie Chart)    │
│  • KEY_BASED: 60%                   │
│  • VOLUME: 35%                      │
│  • NO_KEY: 5%                       │
│                                      │
└──────────────────────────────────────┘
```

### 3.2 확장 대시보드 (Phase 3 — 월별 보고서)

**경로:** `/dashboard` (기존) + `/reports` (신규)

#### 3.2.1 통합 대시보드 (`/dashboard`)

```
┌────────────────────────────────────────────┐
│ 통합 자산 현황                              │
├────────────────────────────────────────────┤
│ 탭: [📊 개요] [🔧 라이선스] [☁️ 클라우드] │
│      [💻 하드웨어] [🔒 도메인/SSL]        │
├────────────────────────────────────────────┤
│ [📊 개요 탭 선택 시]                       │
│                                            │
│ Metric Cards (전체):                      │
│ • 자산 총개: 120개                         │
│ • 월간비용: ₩500M                         │
│ • 만료임박: 5개 (30일)                    │
│ • 관리비율: 95%                           │
│                                            │
│ 자산 유형별 분포 (Donut Chart):           │
│ • SOFTWARE: 45개 (₩200M)                  │
│ • CLOUD: 30개 (₩180M)                    │
│ • HARDWARE: 35개 (₩100M)                 │
│ • DOMAIN_SSL: 10개 (₩20M)                │
│                                            │
│ 월별 비용 추이 (Line Chart):              │
│ [그래프]                                  │
│                                            │
│ 부서별 비용 (Bar Chart):                  │
│ [그래프]                                  │
└────────────────────────────────────────────┘
```

#### 3.2.2 카테고리별 대시보드 (탭 선택)

**라이선스 탭 ([🔧 라이선스]):**
```
Metric Cards:
• 라이선스: 45개
• 연간비용: ₩200M
• 갱신임박: 3개 (D-70)
• 미할당: 5개

라이선스 상태 (Pie):
• 정상: 35개
• 갱신대기: 8개
• 만료: 2개

갱신 타임라인 (Calendar):
[달력 형식으로 갱신 예정일 표시]
```

**클라우드 탭 ([☁️ 클라우드]):**
```
Metric Cards:
• 구독: 30개
• 월간비용: ₩180M
• 미사용: 2개
• 좌석부족: 1개

서비스별 분포 (Pie):
• AWS: 12개
• Azure: 8개
• GCP: 5개
• SaaS: 5개

사용자/좌석 현황 (Table):
[서비스별 사용 인원 vs 할당 인원]
```

**하드웨어 탭 ([💻 하드웨어]):**
```
Metric Cards:
• 자산: 35개
• 총비용: ₩100M
• 평균수명: 4.2년
• 폐기예정: 3개

위치별 분포 (Map/List):
• 서울: 20개
• 부산: 10개
• 대구: 5개

자산연령 분포 (Histogram):
[자산 구매 연도별 분포]
```

**도메인/SSL 탭 ([🔒 도메인/SSL]):**
```
Metric Cards:
• 도메인: 10개
• 갱신비용: ₩20M/년
• 만료임박: 1개 (15일)
• 인증서: 12개

갱신 일정 (Timeline):
[월별 갱신 예정일 리스트]
```

### 3.3 월별 보고서 페이지 (`/reports`)

**[FE-030]** `/reports` — 월별 종합 보고서

```
┌─────────────────────────────────────┐
│ 월별 자산 보고서                     │
├─────────────────────────────────────┤
│ 기간: [2026-02 ▼]   [Excel 내보내기] │
├─────────────────────────────────────┤
│                                     │
│ 📋 보고서 요약                       │
│ ┌─────────────────────────────────┐ │
│ │ • 자산 총개: 120개               │ │
│ │ • 월간비용: ₩500M                │ │
│ │ • 신규등록: 5개 (+₩50M)          │ │
│ │ • 폐기: 2개 (-₩10M)              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📊 자산 유형별 집계                  │
│ ┌─────────────────────────────────┐ │
│ │ SOFTWARE: 45개 @ ₩200M           │ │
│ │ CLOUD: 30개 @ ₩180M             │ │
│ │ HARDWARE: 35개 @ ₩100M          │ │
│ │ DOMAIN_SSL: 10개 @ ₩20M         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📈 부서별 비용 분석                  │
│ ┌─────────────────────────────────┐ │
│ │ 개발팀: ₩250M (50%)              │ │
│ │ 영업팀: ₩150M (30%)              │ │
│ │ 관리팀: ₩100M (20%)              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📝 주요 변동사항                      │
│ ┌─────────────────────────────────┐ │
│ │ [신규] AWS 계정 3개 추가 (+₩30M) │ │
│ │ [폐기] 구형 서버 2대 처리 (-₩8M) │ │
│ │ [갱신] Slack Pro 업그레이드(+2M) │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [PDF 내보내기] [공유]                │
└─────────────────────────────────────┘
```

---

## 4️⃣ 구현 로드맵

### 단계별 우선순위

| 단계 | 항목 | 예상 시기 | 담당 |
|------|------|---------|------|
| **즉시** | Company CRUD UI | 배포 전 | Frontend |
| **즉시** | Company 편집/삭제 API | 배포 전 | Backend |
| **Phase 2** | Asset 모델 + API | 2주 후 | Backend |
| **Phase 2** | 자산 관리 UI | 2주 후 | Frontend |
| **Phase 3** | 확장 대시보드 | 3주 후 | Frontend + Backend |
| **Phase 3** | 월별 보고서 | 3주 후 | Backend + Frontend |

---

## 5️⃣ 데이터 마이그레이션 (Phase 2)

### License → Asset 마이그레이션 전략

```sql
-- Phase 2 시작 시:
INSERT INTO Asset (name, type, cost, purchaseDate, expiryDate, status, createdAt, updatedAt)
SELECT name, 'SOFTWARE', totalAmountKRW, purchaseDate, expiryDate, 'ACTIVE', createdAt, updatedAt
FROM License
WHERE isArchived IS FALSE;

-- 기존 License 데이터 보관 (Phase 2-3 기간 동안)
-- 완전 전환 후 Archive 테이블로 이동
```

---

## 참고

- **API 스펙**: `tasks/api-spec.md` (Company CRUD 추가)
- **DB 스키마**: `tasks/db-changes.md` (Asset 모델 정의)
- **보안 규칙**: `tasks/security/guidelines.md` (권한 검증)
