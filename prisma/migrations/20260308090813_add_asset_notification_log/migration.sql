-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "assetId" INTEGER,
ADD COLUMN     "entityType" TEXT,
ALTER COLUMN "licenseId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "NotificationLog_assetId_idx" ON "NotificationLog"("assetId");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
