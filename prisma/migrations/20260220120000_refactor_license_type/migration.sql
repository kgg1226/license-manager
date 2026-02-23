-- Step 1: Add licenseType column (enum stored as TEXT in SQLite)
ALTER TABLE "License" ADD COLUMN "licenseType" TEXT NOT NULL DEFAULT 'KEY_BASED';

-- Step 2: Migrate existing VOLUME licenses
UPDATE "License" SET "licenseType" = 'VOLUME' WHERE "isVolumeLicense" = 1;

-- Step 3: Add unique index on name
CREATE UNIQUE INDEX "License_name_key" ON "License"("name");

-- Step 4: Drop deprecated columns
ALTER TABLE "License" DROP COLUMN "isVolumeLicense";
ALTER TABLE "License" DROP COLUMN "contractDate";
