-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "reason" TEXT;

-- AlterTable
ALTER TABLE "License" ADD COLUMN "adminName" TEXT;
ALTER TABLE "License" ADD COLUMN "contractDate" DATETIME;
ALTER TABLE "License" ADD COLUMN "noticePeriodDays" INTEGER;
ALTER TABLE "License" ADD COLUMN "price" REAL;

-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assignmentId" INTEGER,
    "licenseId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LicenseGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LicenseGroupMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "licenseGroupId" INTEGER NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LicenseGroupMember_licenseGroupId_fkey" FOREIGN KEY ("licenseGroupId") REFERENCES "LicenseGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LicenseGroupMember_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "googleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "id", "password", "username") SELECT "createdAt", "id", "password", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
