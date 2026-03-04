-- [2026-03-04] A·B·C 스펙 반영 — OrgUnit CRUD / 라이선스 갱신 / 구성원 퇴사 정책
-- 이 파일을 EC2 호스트에서 sqlite3로 직접 실행:
--   sqlite3 /home/ssm-user/app/data/dev.db < migration.sql

-- 1. OrgUnit: sortOrder, updatedAt 추가 + unique 제약 변경
ALTER TABLE "OrgUnit" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrgUnit" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
DROP INDEX IF EXISTS "OrgUnit_name_companyId_parentId_key";
CREATE UNIQUE INDEX "OrgUnit_name_companyId_key" ON "OrgUnit"("name", "companyId");

-- 2. Employee: orgUnitId, status, offboardingUntil 추가
ALTER TABLE "Employee" ADD COLUMN "orgUnitId" INTEGER REFERENCES "OrgUnit"("id") ON DELETE SET NULL;
ALTER TABLE "Employee" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Employee" ADD COLUMN "offboardingUntil" DATETIME;

-- 2a. 데이터 마이그레이션: orgId/subOrgId → orgUnitId
UPDATE "Employee"
SET "orgUnitId" = COALESCE("subOrgId", "orgId")
WHERE "orgUnitId" IS NULL;

-- 2b. 구 컬럼 제거 (SQLite 3.35.0+ 필요)
ALTER TABLE "Employee" DROP COLUMN "orgId";
ALTER TABLE "Employee" DROP COLUMN "subOrgId";

-- 2c. 인덱스 추가
CREATE INDEX IF NOT EXISTS "Employee_orgUnitId_idx" ON "Employee"("orgUnitId");
CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "Employee"("status");

-- 3. User: mustChangePassword 추가
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT 0;

-- 4. License: renewal 필드 추가
ALTER TABLE "License" ADD COLUMN "renewalDate" DATETIME;
ALTER TABLE "License" ADD COLUMN "renewalDateManual" DATETIME;
ALTER TABLE "License" ADD COLUMN "renewalStatus" TEXT NOT NULL DEFAULT 'BEFORE_RENEWAL';

-- 5. LicenseRenewalHistory 테이블 생성
CREATE TABLE IF NOT EXISTS "LicenseRenewalHistory" (
  "id"         INTEGER PRIMARY KEY AUTOINCREMENT,
  "licenseId"  INTEGER NOT NULL REFERENCES "License"("id") ON DELETE CASCADE,
  "fromStatus" TEXT NOT NULL,
  "toStatus"   TEXT NOT NULL,
  "actorType"  TEXT NOT NULL DEFAULT 'USER',
  "actorId"    INTEGER,
  "memo"       TEXT,
  "changedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LicenseRenewalHistory_licenseId_idx" ON "LicenseRenewalHistory"("licenseId");

-- 6. LicenseOwner 테이블 생성
CREATE TABLE IF NOT EXISTS "LicenseOwner" (
  "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
  "licenseId" INTEGER NOT NULL REFERENCES "License"("id") ON DELETE CASCADE,
  "userId"    INTEGER,
  "orgUnitId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LicenseOwner_licenseId_idx" ON "LicenseOwner"("licenseId");

-- 7. NotificationLog 테이블 생성
CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
  "licenseId" INTEGER NOT NULL REFERENCES "License"("id") ON DELETE CASCADE,
  "channel"   TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status"    TEXT NOT NULL,
  "errorMsg"  TEXT,
  "sentAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "NotificationLog_licenseId_idx" ON "NotificationLog"("licenseId");
CREATE INDEX IF NOT EXISTS "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

-- 8. AuditLog: actorType, actorId 추가
ALTER TABLE "AuditLog" ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "AuditLog" ADD COLUMN "actorId"   INTEGER;
