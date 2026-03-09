# DB 스키마 변경 명세

> 기획 세션(/planning)에서 정의한다.
<<<<<<< HEAD
> 백엔드 세션이 이 명세를 보고 호스트에서 `sqlite3`로 직접 SQL 실행한다.
> 프로덕션 컨테이너에서 `prisma CLI` 실행 금지.
> `prisma generate`는 호스트에서 스키마 수정 후 실행.

---
=======
> 백엔드 세션이 이 명세를 보고 호스트에서 sqlite3로 직접 SQL 실행한다.
> 프로덕션 컨테이너에서 prisma CLI 실행 금지.
>>>>>>> c3e278a (docs: CLAUDE.md 슬래시 커맨드 수정 및 프로젝트 가이드 구체화)

## 변경 이력

---

### [2026-03-04] A·B·C 스펙 반영 — OrgUnit CRUD / 라이선스 갱신 / 구성원 퇴사 정책

#### 배경
기획 세션에서 아래 스펙이 확정됨:
- A. OrgUnit 트리 CRUD + 구성원 드래그&드롭 이동
- B. 라이선스 갱신 알림 (상태 머신 + 스케줄 알림)
- C. 구성원 OFFBOARDING 7일 유예 후 자동 삭제

---

#### 1. 신규 Enum 추가

```sql
-- MemberStatus: 구성원 상태
-- SQLite는 ENUM 미지원 → prisma schema에서 String으로 관리, 앱 레벨에서 제약

-- RenewalStatus: 라이선스 갱신 진행 상태
-- BEFORE_RENEWAL | IN_PROGRESS | NOT_RENEWING | RENEWED
```

prisma/schema.prisma 에 추가:
```prisma
enum MemberStatus {
  ACTIVE
  OFFBOARDING
  DELETED
}

enum RenewalStatus {
  BEFORE_RENEWAL
  IN_PROGRESS
  NOT_RENEWING
  RENEWED
}
```

---

#### 2. OrgUnit 테이블 변경

**추가 컬럼:**
```sql
ALTER TABLE "OrgUnit" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrgUnit" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

**Unique 제약 변경:**
- 기존: `UNIQUE(name, companyId, parentId)` → 동일 회사 내 같은 depth에서 중복 가능
- 변경: `UNIQUE(name, companyId)` → 동일 회사 내 부서명 전체 고유
```sql
-- 기존 인덱스 삭제 후 재생성 (SQLite는 ALTER INDEX 미지원)
DROP INDEX IF EXISTS "OrgUnit_name_companyId_parentId_key";
CREATE UNIQUE INDEX "OrgUnit_name_companyId_key" ON "OrgUnit"("name", "companyId");
```

**prisma/schema.prisma 변경:**
```prisma
model OrgUnit {
  id        Int        @id @default(autoincrement())
  name      String
  companyId Int
  parentId  Int?
  sortOrder Int        @default(0)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  company   OrgCompany @relation(fields: [companyId], references: [id])
  parent    OrgUnit?   @relation("OrgHierarchy", fields: [parentId], references: [id])
  children  OrgUnit[]  @relation("OrgHierarchy")
  members   Employee[] @relation("OrgMembers")

  @@unique([name, companyId])
}
```

---

#### 3. Employee 테이블 변경

**배경:**
- `orgId` + `subOrgId` 이중 필드 → `orgUnitId` 단일 필드로 통합 (OrgUnit 트리가 depth 무제한이므로)
- `status` / `offboardingUntil` 추가 (OFFBOARDING 정책)
- 개인 이메일 제거, 회사 이메일(`email`)만 유지 (기존 필드명 그대로)
- `subOrg` 관계 제거

**컬럼 추가:**
```sql
ALTER TABLE "Employee" ADD COLUMN "orgUnitId" INTEGER REFERENCES "OrgUnit"("id") ON DELETE SET NULL;
ALTER TABLE "Employee" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Employee" ADD COLUMN "offboardingUntil" DATETIME;
```

**데이터 마이그레이션 (orgId/subOrgId → orgUnitId):**
```sql
-- subOrgId가 있으면 우선, 없으면 orgId 사용
UPDATE "Employee"
SET "orgUnitId" = COALESCE("subOrgId", "orgId")
WHERE "orgUnitId" IS NULL;
```

**기존 컬럼 제거 (SQLite는 DROP COLUMN 지원 버전 확인 필요):**
```sql
-- SQLite 3.35.0+ 에서 DROP COLUMN 지원
ALTER TABLE "Employee" DROP COLUMN "orgId";
ALTER TABLE "Employee" DROP COLUMN "subOrgId";
```
> ⚠️ 버전 미만이면: 새 테이블 생성 → 데이터 복사 → 테이블 교체 방식으로 마이그레이션.

**prisma/schema.prisma 변경:**
```prisma
model Employee {
  id               Int          @id @default(autoincrement())
  name             String
  department       String
  email            String?      @unique   // 회사 이메일
  title            String?
  companyId        Int?
  orgUnitId        Int?                   // null이면 미소속
  status           MemberStatus @default(ACTIVE)
  offboardingUntil DateTime?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  assignments      Assignment[]
  company          OrgCompany?  @relation(fields: [companyId], references: [id])
  orgUnit          OrgUnit?     @relation("OrgMembers", fields: [orgUnitId], references: [id])

  @@index([orgUnitId])
  @@index([status])
}
```

---

#### 4. License 테이블 변경

**추가 컬럼:**
```sql
ALTER TABLE "License" ADD COLUMN "renewalDate" DATETIME;
ALTER TABLE "License" ADD COLUMN "renewalDateManual" DATETIME;
ALTER TABLE "License" ADD COLUMN "renewalStatus" TEXT NOT NULL DEFAULT 'BEFORE_RENEWAL';
```

> `expiryDate`는 하위호환을 위해 유지. `renewalDate`가 새 기준 필드.
> 자동 계산 우선순위: `renewalDateManual` 있으면 우선, 없으면 `renewalDate` 사용.

**prisma/schema.prisma 변경 (License 모델에 추가):**
```prisma
renewalDate        DateTime?
renewalDateManual  DateTime?
renewalStatus      RenewalStatus @default(BEFORE_RENEWAL)
renewalHistories   LicenseRenewalHistory[]
owners             LicenseOwner[]
```

---

#### 5. 신규 테이블: LicenseRenewalHistory

갱신 상태 변경 이력.

```sql
CREATE TABLE "LicenseRenewalHistory" (
  "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
  "licenseId"   INTEGER NOT NULL REFERENCES "License"("id") ON DELETE CASCADE,
  "fromStatus"  TEXT NOT NULL,
  "toStatus"    TEXT NOT NULL,
  "actorType"   TEXT NOT NULL DEFAULT 'USER',  -- USER | SYSTEM
  "actorId"     INTEGER,                        -- userId, SYSTEM이면 NULL
  "memo"        TEXT,
  "changedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LicenseRenewalHistory_licenseId_idx" ON "LicenseRenewalHistory"("licenseId");
```

**prisma/schema.prisma:**
```prisma
model LicenseRenewalHistory {
  id        Int       @id @default(autoincrement())
  licenseId Int
  fromStatus RenewalStatus
  toStatus   RenewalStatus
  actorType  String   @default("USER")
  actorId    Int?
  memo       String?
  changedAt  DateTime @default(now())
  license    License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@index([licenseId])
}
```

---

#### 6. 신규 테이블: LicenseOwner

라이선스 알림 담당자. 개인(userId) 또는 부서(orgUnitId) 중 하나를 가짐.

```sql
CREATE TABLE "LicenseOwner" (
  "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
  "licenseId" INTEGER NOT NULL REFERENCES "License"("id") ON DELETE CASCADE,
  "userId"    INTEGER,               -- User 담당자 (nullable)
  "orgUnitId" INTEGER,               -- 부서 담당자 (nullable)
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (("userId" IS NULL) != ("orgUnitId" IS NULL))  -- 둘 중 하나만
);
CREATE INDEX "LicenseOwner_licenseId_idx" ON "LicenseOwner"("licenseId");
```

**prisma/schema.prisma:**
```prisma
model LicenseOwner {
  id        Int      @id @default(autoincrement())
  licenseId Int
  userId    Int?     // 개인 담당자
  orgUnitId Int?     // 부서 담당자 (해당 부서 전체에 알림)
  createdAt DateTime @default(now())
  license   License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@index([licenseId])
}
```

---

#### 7. 신규 테이블: NotificationLog

발송 시도 이력 (성공/실패 모두 기록).

```sql
CREATE TABLE "NotificationLog" (
  "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
  "licenseId" INTEGER NOT NULL REFERENCES "License"("id") ON DELETE CASCADE,
  "channel"   TEXT NOT NULL,           -- SLACK | EMAIL
  "recipient" TEXT NOT NULL,           -- Slack ID 또는 이메일 주소
  "status"    TEXT NOT NULL,           -- SUCCESS | FAILED
  "errorMsg"  TEXT,
  "sentAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "NotificationLog_licenseId_idx" ON "NotificationLog"("licenseId");
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");
```

**prisma/schema.prisma:**
```prisma
model NotificationLog {
  id        Int      @id @default(autoincrement())
  licenseId Int
  channel   String   // SLACK | EMAIL
  recipient String
  status    String   // SUCCESS | FAILED
  errorMsg  String?
  sentAt    DateTime @default(now())
  license   License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@index([licenseId])
  @@index([sentAt])
}
```

---

#### 8. AuditLog 테이블 보강

기존 `actor String?` → `actorType` / `actorId` 분리.

```sql
ALTER TABLE "AuditLog" ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'USER';  -- USER | SYSTEM
ALTER TABLE "AuditLog" ADD COLUMN "actorId"   INTEGER;  -- userId, SYSTEM이면 NULL
```

> 기존 `actor` 컬럼은 하위호환 유지를 위해 남겨두고 신규 기록부터 actorType/actorId 사용.

---

#### 요약 체크리스트 (백엔드 실행 순서)

1. [ ] Enum 추가 (schema.prisma 반영)
2. [ ] OrgUnit: `sortOrder`, `updatedAt` 컬럼 추가 + unique 재설정
3. [ ] Employee: `orgUnitId`, `status`, `offboardingUntil` 추가 → 데이터 마이그레이션 → 구 컬럼 제거
4. [ ] License: `renewalDate`, `renewalDateManual`, `renewalStatus` 추가
5. [ ] `LicenseRenewalHistory` 테이블 생성
6. [ ] `LicenseOwner` 테이블 생성
7. [ ] `NotificationLog` 테이블 생성
8. [ ] AuditLog: `actorType`, `actorId` 추가
9. [ ] `prisma generate` 실행 (호스트에서)
