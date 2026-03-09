# 기능 스펙 — 자산 유형 확장 (Phase 2)

> 기획 세션(/planning)에서 관리한다.
> 우선순위: 🟢 Phase 2 (Supabase 전환 후)
> 상태: ⏳ 대기 (Supabase 전환 완료 필요)
> 최종 업데이트: 2026-03-06

---

## 배경 및 목표

현재 시스템은 소프트웨어 라이선스만 관리한다.
클라우드 구독, 하드웨어, 도메인/SSL 등 다양한 자산 유형을 동일한 인터페이스에서 관리할 수 있도록 확장한다.

---

## 인프라 전환 (선행 필수)

### SQLite → Supabase PostgreSQL

| 파일 | 변경 내용 |
|---|---|
| `prisma/schema.prisma` | `provider = "sqlite"` → `"postgresql"` |
| `lib/prisma.ts` | `PrismaBetterSqlite3` 어댑터 제거 → 표준 `PrismaClient()` |
| `package.json` | `better-sqlite3`, `@prisma/adapter-better-sqlite3`, `@types/better-sqlite3` 제거 |
| `deploy.sh` | SQLite 볼륨 마운트 제거, `DATABASE_URL` 환경변수로 대체 |

### 환경변수
```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

---

## 신규 DB 스키마

### Asset (범용 자산 모델)

```prisma
enum AssetType {
  SOFTWARE      // 소프트웨어 라이선스 (기존 License와 별개로 신규 등록)
  CLOUD         // 클라우드·SaaS 구독
  HARDWARE      // 실물 자산
  DOMAIN_SSL    // 도메인·SSL 인증서
  OTHER         // 기타
}

enum AssetStatus {
  ACTIVE        // 사용 중
  INACTIVE      // 미사용·대기
  DISPOSED      // 폐기
}

model Asset {
  id              Int          @id @default(autoincrement())
  type            AssetType
  status          AssetStatus  @default(ACTIVE)
  name            String                         // 자산명 (예: "AWS Production", "MacBook Pro 16")
  vendor          String?                        // 공급업체
  description     String?

  // 비용
  monthlyCost     Decimal?     @db.Decimal(12, 2)  // 월 환산 비용 (집계 기준)
  cost            Decimal?     @db.Decimal(12, 2)  // 실제 청구 금액
  currency        String?      @default("KRW")
  billingCycle    String?                        // MONTHLY | ANNUAL | ONE_TIME

  // 일정
  purchaseDate    DateTime?
  expiryDate      DateTime?
  renewalDate     DateTime?

  // 소유·배정
  companyId       Int?
  orgUnitId       Int?                           // 배정 부서
  assigneeId      Int?                           // 배정 조직원

  // 메타
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  createdBy       Int?                           // userId

  // 관계
  company         OrgCompany?  @relation(fields: [companyId], references: [id])
  orgUnit         OrgUnit?     @relation(fields: [orgUnitId], references: [id])
  assignee        Employee?    @relation(fields: [assigneeId], references: [id])
  hardwareDetail  HardwareDetail?
  cloudDetail     CloudDetail?
  auditLogs       AuditLog[]   @relation("AssetAudit")

  @@index([type])
  @@index([status])
  @@index([expiryDate])
  @@index([companyId])
}
```

### HardwareDetail (하드웨어 상세)

```prisma
model HardwareDetail {
  id           Int     @id @default(autoincrement())
  assetId      Int     @unique
  manufacturer String?                 // 제조사 (Apple, Dell, LG 등)
  model        String?                 // 모델명
  serialNumber String?                 // 시리얼 넘버
  location     String?                 // 보관 위치 (본사 3층, 재택 등)
  specs        Json?                   // { cpu, ram, storage, ... }
  asset        Asset   @relation(fields: [assetId], references: [id], onDelete: Cascade)
}
```

### CloudDetail (클라우드/SaaS 상세)

```prisma
model CloudDetail {
  id          Int     @id @default(autoincrement())
  assetId     Int     @unique
  platform    String?                  // AWS, GCP, Azure, Slack, Notion 등
  accountId   String?                  // 계정 ID / 이메일
  region      String?                  // 리전 (ap-northeast-2 등)
  seatCount   Int?                     // 라이선스 수량
  asset       Asset   @relation(fields: [assetId], references: [id], onDelete: Cascade)
}
```

---

## API 스펙

### 자산 목록 조회
```
GET /api/assets
Query: type?, status?, companyId?, orgUnitId?, assigneeId?, search?, page?, limit?

Response 200:
{
  "assets": [
    {
      "id": 1,
      "type": "HARDWARE",
      "name": "MacBook Pro 16 (2024)",
      "vendor": "Apple",
      "status": "ACTIVE",
      "monthlyCost": 150000,
      "currency": "KRW",
      "expiryDate": null,
      "assignee": { "id": 3, "name": "홍길동" },
      "orgUnit": { "id": 2, "name": "개발팀" },
      "hardwareDetail": { "serialNumber": "ABC123", "location": "본사 3층" }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### 자산 등록
```
POST /api/assets
Body:
{
  "type": "HARDWARE" | "CLOUD" | "SOFTWARE" | "DOMAIN_SSL" | "OTHER",
  "name": string,
  "vendor": string?,
  "description": string?,
  "cost": number?,
  "currency": string?,          // 기본 "KRW"
  "billingCycle": string?,      // "MONTHLY" | "ANNUAL" | "ONE_TIME"
  "monthlyCost": number?,       // 직접 입력 또는 cost+billingCycle 에서 자동 계산
  "purchaseDate": string?,      // ISO 8601
  "expiryDate": string?,
  "renewalDate": string?,
  "companyId": number?,
  "orgUnitId": number?,
  "assigneeId": number?,
  // 유형별 상세 (선택)
  "hardwareDetail": { "manufacturer": string?, "model": string?, "serialNumber": string?, "location": string?, "specs": object? }?,
  "cloudDetail": { "platform": string?, "accountId": string?, "region": string?, "seatCount": number? }?
}

Response 201: { "id": number, ... }
```

### 자산 상세 조회
```
GET /api/assets/[id]
Response 200: Asset + 유형별 detail + 최근 AuditLog 10건
```

### 자산 수정
```
PUT /api/assets/[id]
Body: POST와 동일 (부분 수정 허용)
Response 200: 수정된 Asset
```

### 자산 상태 변경
```
PATCH /api/assets/[id]/status
Body: { "status": "INACTIVE" | "DISPOSED", "memo": string? }
Response 200: { "id", "status" }
```

### 자산 삭제
```
DELETE /api/assets/[id]
- ACTIVE 상태 자산은 삭제 불가 (DISPOSED로 먼저 변경 필요)
Response 204
```

### 만료 임박 자산 목록
```
GET /api/assets/expiring
Query: withinDays=30 (기본값)
Response 200: { "assets": Asset[] }
```

---

## UI 화면 스펙

### /assets — 자산 목록
- 탭: 전체 / 소프트웨어 / 클라우드 / 하드웨어 / 도메인·SSL
- 컬럼: 자산명 / 유형 / 담당부서 / 배정자 / 월비용 / 만료일 / 상태
- 필터: 상태, 부서, 만료 임박
- 상단: 유형별 자산 수 + 총 월 비용 요약 카드

### /assets/new — 자산 등록
- 유형 선택 → 유형별 추가 입력 필드 표시
- 비용 입력: 결제 금액 + 결제 주기 → 월 환산 자동 계산

### /assets/[id] — 자산 상세
- 기본 정보, 유형별 상세, 배정 이력, AuditLog

---

## 비용 자동 계산 규칙

| 결제 주기 | monthlyCost 계산 |
|---|---|
| MONTHLY | `cost` 그대로 |
| ANNUAL | `cost / 12` |
| ONE_TIME | `0` (월 비용 없음, 자산 가치로만 관리) |
| 직접 입력 | 입력값 그대로 |

---

## 구현 순서 (백엔드 → 프론트엔드)

1. **[BE-020]** Supabase 전환 완료 후 `prisma/schema.prisma`에 Asset, HardwareDetail, CloudDetail 추가
2. **[BE-021]** `GET|POST /api/assets` 구현
3. **[BE-022]** `GET|PUT|DELETE /api/assets/[id]` 구현
4. **[BE-023]** `PATCH /api/assets/[id]/status` 구현
5. **[BE-024]** `GET /api/assets/expiring` 구현
6. **[BE-025]** `POST /api/cron/renewal-notify` 에 Asset 만료 알림 통합 (expiryDate 기준)
7. **[FE-010]** `/assets` 목록 페이지
8. **[FE-011]** `/assets/new` 등록 폼
9. **[FE-012]** `/assets/[id]` 상세 페이지
