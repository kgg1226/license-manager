-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('SOFTWARE', 'CLOUD', 'HARDWARE', 'DOMAIN_SSL', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISPOSED');

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "description" TEXT,
    "monthlyCost" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'KRW',
    "billingCycle" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "companyId" INTEGER,
    "orgUnitId" INTEGER,
    "assigneeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareDetail" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "specs" JSONB,

    CONSTRAINT "HardwareDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudDetail" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "platform" TEXT,
    "accountId" TEXT,
    "region" TEXT,
    "seatCount" INTEGER,

    CONSTRAINT "CloudDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_expiryDate_idx" ON "Asset"("expiryDate");

-- CreateIndex
CREATE INDEX "Asset_companyId_idx" ON "Asset"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareDetail_assetId_key" ON "HardwareDetail"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "CloudDetail_assetId_key" ON "CloudDetail"("assetId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "OrgCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDetail" ADD CONSTRAINT "HardwareDetail_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudDetail" ADD CONSTRAINT "CloudDetail_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
