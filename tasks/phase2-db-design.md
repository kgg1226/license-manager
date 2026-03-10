# Phase 2 데이터베이스 스키마 설계

> **Asset Management Abstraction — 통합 자산 관리로의 진화**
>
> 라이선스 중심 시스템 → Asset 기반 통합 자산 관리 시스템으로 전환
>
> **버전**: 1.0
> **작성일**: 2026-03-07
> **목표 완료일**: 2026-03-14 (1주)

---

## 📋 변경 개요

### 기존 구조 (Phase 1)
```
License (라이선스 중심)
  └─ Assignment (할당)
  └─ LicenseSeat (사용 권한)
  └─ LicenseGroup (그룹화)
```

### 새로운 구조 (Phase 2)
```
Asset (모든 IT 자산의 단일 진입점)
  ├─ AssetType: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
  ├─ AssetStatus: ACTIVE, INACTIVE, DISPOSED
  └─ Assignment (자산 할당)

License (Asset 확장: 소프트웨어 라이선스 전용)
  ├─ Asset 상속 개념 유지 (또는 별도 모델)
  └─ 라이선스 특화 필드 (구독 주기, 갱신 정책 등)
```

---

## 🎯 추가할 테이블 & 모델

### 1. **Asset** 테이블 (신규)

모든 IT 자산의 기본 정보를 저장하는 핵심 테이블.

#### Prisma 스키마

```prisma
enum AssetType {
  SOFTWARE     // 소프트웨어 라이선스
  CLOUD        // 클라우드 구독 (AWS, Azure, GCP 등)
  HARDWARE     // 하드웨어 (컴퓨터, 프린터, 모니터 등)
  DOMAIN_SSL   // 도메인/SSL 인증서
  OTHER        // 기타 자산
}

enum AssetStatus {
  ACTIVE       // 활성 (현재 사용 중)
  INACTIVE     // 비활성 (일시 중지)
  DISPOSED     // 회수됨 (삭제됨)
}

model Asset {
  id              String   @id @default(cuid())

  // 기본 정보
  name            String   @db.VarChar(255)      // 자산명: "Microsoft 365", "AWS 계정", "HP 프린터" 등
  type            AssetType                       // 자산 유형
  description     String?  @db.Text              // 상세 설명

  // 상태 & 라이프사이클
  status          AssetStatus @default(ACTIVE)
  expiryDate      DateTime?                       // 만료일 (구독 종료일, 도메인 갱신일 등)

  // 재정 정보
  cost            Decimal  @db.Decimal(15, 2)    // 원가 (월간 또는 연간)
  currency        String   @default("USD")        // 통화코드 (USD, KRW 등)
  costFrequency   String   @default("MONTHLY")    // MONTHLY | YEARLY | ONE_TIME

  // 할당 정보
  assignedTo      Employee? @relation(fields: [assignedToId], references: [id], onDelete: SetNull)
  assignedToId    String?

  // 감사 & 메타데이터
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String                          // User ID who created

  // 관계
  assignments     Assignment[]                    // 할당 이력
  auditLogs       AuditLog[]                      // 감사 로그

  @@index([type])
  @@index([status])
  @@index([expiryDate])
  @@index([assignedToId])
  @@fulltext([name, description])                // 전문 검색 지원
}
```

#### SQL 생성 명령

```sql
CREATE TABLE "Asset" (
  "id"            TEXT PRIMARY KEY,
  "name"          VARCHAR(255) NOT NULL,
  "type"          TEXT NOT NULL,                 -- ENUM: SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER
  "description"   TEXT,
  "status"        TEXT NOT NULL DEFAULT 'ACTIVE', -- ENUM: ACTIVE, INACTIVE, DISPOSED
  "expiryDate"    DATETIME,
  "cost"          DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "currency"      TEXT NOT NULL DEFAULT 'USD',
  "costFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  "assignedToId"  TEXT REFERENCES "Employee"("id") ON DELETE SET NULL,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"     TEXT NOT NULL
);

CREATE INDEX "Asset_type_idx" ON "Asset"("type");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_expiryDate_idx" ON "Asset"("expiryDate");
CREATE INDEX "Asset_assignedToId_idx" ON "Asset"("assignedToId");
```

---

### 2. **Assignment** 모델 확장

기존 Assignment 모델을 Asset 지원으로 확장.

#### 변경 사항

```prisma
model Assignment {
  id              Int      @id @default(autoincrement())

  // 기본 정보
  employeeId      Int      @db.Int
  startDate       DateTime
  endDate         DateTime?
  status          String   @default("ACTIVE")    // ACTIVE | REVOKED | EXPIRED

  // Asset/License 중 하나를 참조 (polymorphic 구현)
  assetId         String?                        // Asset 참조 (신규)
  licenseId       Int?                           // License 참조 (기존)

  // 할당 관련 정보
  cost            Decimal? @db.Decimal(15, 2)   // 해당 할당의 비용 (선택)
  notes           String?

  // 감사
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String

  // 관계
  employee        Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  asset           Asset?   @relation(fields: [assetId], references: [id], onDelete: SetNull)
  license         License? @relation(fields: [licenseId], references: [id], onDelete: SetNull)
  auditLogs       AuditLog[]

  @@unique([employeeId, assetId, startDate])    // 동일 직원이 같은 자산을 중복 할당 불가 (동시간)
  @@unique([employeeId, licenseId, startDate])  // 라이선스도 동일
  @@index([assetId])
  @@index([licenseId])
  @@index([status])
}
```

#### SQL 변경

```sql
ALTER TABLE "Assignment" ADD COLUMN "assetId" TEXT REFERENCES "Asset"("id") ON DELETE SET NULL;
CREATE INDEX "Assignment_assetId_idx" ON "Assignment"("assetId");

-- 기존 unique 제약 수정 (선택사항: 필요시)
-- DROP INDEX IF EXISTS "Assignment_employeeId_licenseId_startDate_key";
-- CREATE UNIQUE INDEX "Assignment_employeeId_assetId_startDate_key" ON "Assignment"("employeeId", "assetId", "startDate") WHERE "assetId" IS NOT NULL;
-- CREATE UNIQUE INDEX "Assignment_employeeId_licenseId_startDate_key" ON "Assignment"("employeeId", "licenseId", "startDate") WHERE "licenseId" IS NOT NULL;
```

---

### 3. **AuditLog** 테이블 확장

Asset 엔티티 지원 추가.

#### Prisma 스키마 변경

```prisma
model AuditLog {
  id              String   @id @default(cuid())

  // 기본 정보
  action          String                         // CREATED | UPDATED | DELETED | STATUS_CHANGED
  entityType      String                         // USER | LICENSE | EMPLOYEE | ASSIGNMENT | ASSET (신규)
  entityId        String                         // 대상 ID

  // 변경 사항
  changes         Json?                          // { before, after }
  details         String?                        // 추가 설명

  // 감시 정보
  actorType       String   @default("USER")      // USER | SYSTEM
  actorId         String?                        // userId, SYSTEM이면 NULL
  ipAddress       String?
  userAgent       String?

  // 시간 정보
  createdAt       DateTime @default(now())

  @@index([entityType])
  @@index([entityId])
  @@index([actorType])
  @@index([createdAt])
}
```

#### SQL 변경 (필요시)

```sql
-- 이미 존재하는 경우 스킵
-- entityType에 ASSET 추가는 app logic에서 처리 (enum 제약 제거)
```

---

## 📊 관계도 (ER 다이어그램)

```
┌─────────────┐
│   Employee  │
│ (구성원)    │
└──────┬──────┘
       │
       │ 할당
       │
       ├─────────────────────────┐
       │                         │
┌──────▼──────┐         ┌────────▼─────┐
│    Asset    │◄────────┤  Assignment  │
│ (자산)      │◄────────┤  (할당)      │
│             │         │              │
│ • SOFTWARE  │         └──────┬───────┘
│ • CLOUD     │                │
│ • HARDWARE  │                │
│ • DOMAIN    │         ┌──────▼───────┐
│ • OTHER     │         │   License    │
└─────────────┘         │  (라이선스)  │
                        │              │
                        │ (Asset 상속  │
                        │  개념 또는    │
                        │  관계형)     │
                        └──────────────┘
```

---

## 🔄 마이그레이션 전략

### Phase 2 - Week 1: Asset 모델 도입

#### 1단계: Asset 테이블 생성 (BE-020)
- [x] `Asset` enum 및 모델 정의 (prisma/schema.prisma)
- [x] `prisma migrate dev --name "add_asset_model"`
- [x] `prisma generate` (generated/prisma/ 업데이트)
- [x] DB에서 Asset 테이블 생성 확인

#### 2단계: Assignment 확장 (BE-020 일부)
- [x] `Assignment.assetId` 컬럼 추가
- [x] Unique 제약 조정 (선택사항)
- [x] `prisma migrate dev`

#### 3단계: API 구현 (BE-021~025)
- [x] GET /api/assets (목록, 필터, 페이지네이션)
- [x] POST /api/assets (자산 등록)
- [x] GET /api/assets/[id] (상세 조회)
- [x] PUT /api/assets/[id] (수정)
- [x] DELETE /api/assets/[id] (삭제)
- [x] PATCH /api/assets/[id]/status (상태 변경)
- [x] 배치 작업: 만료 알림, 비용 분석

#### 4단계: Frontend 구현 (FE-010~012)
- [x] Asset 목록 페이지 (필터, 검색, 페이지네이션)
- [x] Asset 등록/수정 폼
- [x] Asset 상세 페이지 (할당, 상태 관리)

---

## 📝 구현 체크리스트

### 스키마 설계 (완료)
- [x] Asset 모델 정의
- [x] AssetType, AssetStatus Enum 정의
- [x] Assignment 확장
- [x] AuditLog 확장
- [x] ER 다이어그램 작성

### 마이그레이션 스크립트 (Backend 담당)
- [ ] prisma/schema.prisma 수정
  ```bash
  npx prisma migrate dev --name "add_asset_model"
  npx prisma generate
  ```

### 데이터 마이그레이션 (선택)
- [ ] 기존 License → Asset 변환 (선택사항)
  ```sql
  INSERT INTO "Asset" (id, name, type, cost, expiryDate, assignedToId, createdAt, createdBy)
  SELECT cuid(), title, 'SOFTWARE', cost, expiryDate, NULL, createdAt, createdBy
  FROM "License"
  WHERE deleted_at IS NULL;

  UPDATE "Assignment" SET assetId = ? WHERE licenseId = ? AND ...;
  ```

### 기존 기능 호환성 (확인 필수)
- [ ] License 기능 정상 작동 확인
- [ ] Assignment 쿼리 성능 영향 없음
- [ ] AuditLog 기록 정상

---

## 🚀 다음 단계

1. **Backend**: BE-020 스키마 수정 시작
2. **Frontend**: Asset 목록 페이지 UI 설계 (BE-020 완료 대기)
3. **DevOps**: 마이그레이션 스크립트 테스트 환경 준비
4. **Security**: Asset 접근 제어 정책 정의 (tasks/security/guidelines.md 업데이트)

---

## 📚 참고 자료

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma Enums](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#enums)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- TICKETS.md: BE-020~025, FE-010~012 상세 명세
- VISION.md: Phase 2 목표 및 로드맵
