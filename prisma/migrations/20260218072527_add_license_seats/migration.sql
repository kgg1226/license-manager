-- CreateTable
CREATE TABLE "LicenseSeat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "licenseId" INTEGER NOT NULL,
    "key" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LicenseSeat_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "licenseId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "seatId" INTEGER,
    "assignedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedDate" DATETIME,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assignment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "LicenseSeat" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Assignment" ("assignedDate", "createdAt", "employeeId", "id", "licenseId", "reason", "returnedDate") SELECT "assignedDate", "createdAt", "employeeId", "id", "licenseId", "reason", "returnedDate" FROM "Assignment";
DROP TABLE "Assignment";
ALTER TABLE "new_Assignment" RENAME TO "Assignment";
CREATE INDEX "Assignment_licenseId_idx" ON "Assignment"("licenseId");
CREATE INDEX "Assignment_employeeId_idx" ON "Assignment"("employeeId");
CREATE INDEX "Assignment_seatId_idx" ON "Assignment"("seatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LicenseSeat_key_key" ON "LicenseSeat"("key");

-- CreateIndex
CREATE INDEX "LicenseSeat_licenseId_idx" ON "LicenseSeat"("licenseId");
