-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_License" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "key" TEXT,
    "isVolumeLicense" BOOLEAN NOT NULL DEFAULT false,
    "totalQuantity" INTEGER NOT NULL,
    "price" REAL,
    "purchaseDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "contractDate" DATETIME,
    "noticePeriodDays" INTEGER,
    "adminName" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_License" ("adminName", "contractDate", "createdAt", "description", "expiryDate", "id", "key", "name", "noticePeriodDays", "price", "purchaseDate", "totalQuantity", "updatedAt") SELECT "adminName", "contractDate", "createdAt", "description", "expiryDate", "id", "key", "name", "noticePeriodDays", "price", "purchaseDate", "totalQuantity", "updatedAt" FROM "License";
DROP TABLE "License";
ALTER TABLE "new_License" RENAME TO "License";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
