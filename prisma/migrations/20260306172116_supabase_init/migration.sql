-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('NO_KEY', 'KEY_BASED', 'VOLUME');

-- CreateEnum
CREATE TYPE "PaymentCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('KRW', 'USD', 'EUR', 'JPY', 'GBP', 'CNY');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'OFFBOARDING', 'DELETED');

-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('BEFORE_RENEWAL', 'IN_PROGRESS', 'NOT_RENEWING', 'RENEWED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT,
    "licenseType" "LicenseType" NOT NULL DEFAULT 'KEY_BASED',
    "totalQuantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "noticePeriodDays" INTEGER,
    "adminName" TEXT,
    "description" TEXT,
    "paymentCycle" "PaymentCycle",
    "quantity" INTEGER,
    "unitPrice" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'KRW',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isVatIncluded" BOOLEAN NOT NULL DEFAULT false,
    "totalAmountForeign" DOUBLE PRECISION,
    "totalAmountKRW" DOUBLE PRECISION,
    "renewalDate" TIMESTAMP(3),
    "renewalDateManual" TIMESTAMP(3),
    "renewalStatus" "RenewalStatus" NOT NULL DEFAULT 'BEFORE_RENEWAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "title" TEXT,
    "companyId" INTEGER,
    "orgUnitId" INTEGER,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "offboardingUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgCompany" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseSeat" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "seatId" INTEGER,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedDate" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER,
    "licenseId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseGroupMember" (
    "id" SERIAL NOT NULL,
    "licenseGroupId" INTEGER NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseRenewalHistory" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "fromStatus" "RenewalStatus" NOT NULL,
    "toStatus" "RenewalStatus" NOT NULL,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "actorId" INTEGER,
    "memo" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseRenewalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseOwner" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "userId" INTEGER,
    "orgUnitId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "actorId" INTEGER,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "License_name_key" ON "License"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_orgUnitId_idx" ON "Employee"("orgUnitId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrgCompany_name_key" ON "OrgCompany"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_name_companyId_key" ON "OrgUnit"("name", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseSeat_key_key" ON "LicenseSeat"("key");

-- CreateIndex
CREATE INDEX "LicenseSeat_licenseId_idx" ON "LicenseSeat"("licenseId");

-- CreateIndex
CREATE INDEX "Assignment_licenseId_idx" ON "Assignment"("licenseId");

-- CreateIndex
CREATE INDEX "Assignment_employeeId_idx" ON "Assignment"("employeeId");

-- CreateIndex
CREATE INDEX "Assignment_seatId_idx" ON "Assignment"("seatId");

-- CreateIndex
CREATE INDEX "AssignmentHistory_employeeId_idx" ON "AssignmentHistory"("employeeId");

-- CreateIndex
CREATE INDEX "AssignmentHistory_licenseId_idx" ON "AssignmentHistory"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseGroup_name_key" ON "LicenseGroup"("name");

-- CreateIndex
CREATE INDEX "LicenseGroupMember_licenseId_idx" ON "LicenseGroupMember"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseGroupMember_licenseGroupId_licenseId_key" ON "LicenseGroupMember"("licenseGroupId", "licenseId");

-- CreateIndex
CREATE INDEX "LicenseRenewalHistory_licenseId_idx" ON "LicenseRenewalHistory"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseOwner_licenseId_idx" ON "LicenseOwner"("licenseId");

-- CreateIndex
CREATE INDEX "NotificationLog_licenseId_idx" ON "NotificationLog"("licenseId");

-- CreateIndex
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "OrgCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "OrgCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseSeat" ADD CONSTRAINT "LicenseSeat_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "LicenseSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseGroupMember" ADD CONSTRAINT "LicenseGroupMember_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseGroupMember" ADD CONSTRAINT "LicenseGroupMember_licenseGroupId_fkey" FOREIGN KEY ("licenseGroupId") REFERENCES "LicenseGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseRenewalHistory" ADD CONSTRAINT "LicenseRenewalHistory_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseOwner" ADD CONSTRAINT "LicenseOwner_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
