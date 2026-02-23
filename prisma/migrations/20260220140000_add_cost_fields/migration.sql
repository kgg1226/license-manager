-- Add cost calculation fields to License table
ALTER TABLE "License" ADD COLUMN "paymentCycle" TEXT;
ALTER TABLE "License" ADD COLUMN "quantity" INTEGER;
ALTER TABLE "License" ADD COLUMN "unitPrice" REAL;
ALTER TABLE "License" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW';
ALTER TABLE "License" ADD COLUMN "exchangeRate" REAL NOT NULL DEFAULT 1.0;
ALTER TABLE "License" ADD COLUMN "isVatIncluded" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "License" ADD COLUMN "totalAmountForeign" REAL;
ALTER TABLE "License" ADD COLUMN "totalAmountKRW" REAL;
