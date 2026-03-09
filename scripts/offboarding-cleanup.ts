/**
 * OFFBOARDING 자동 삭제 배치 — 독립 실행 스크립트
 *
 * 실행: npx tsx scripts/offboarding-cleanup.ts
 * 스케줄 예시 (cron): 0 2 * * * cd /app && npx tsx scripts/offboarding-cleanup.ts
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { runOffboardingCleanup } from "../lib/batch/offboarding-cleanup";

const prisma = new PrismaClient();

async function main() {
  console.log(`[${new Date().toISOString()}] OFFBOARDING 자동 삭제 배치 시작`);

  const result = await runOffboardingCleanup(prisma);

  console.log(`처리 대상: ${result.processedCount}명`);
  console.log(`삭제 완료: ${result.deletedIds.length}명 (IDs: ${result.deletedIds.join(", ") || "없음"})`);

  if (result.errors.length > 0) {
    console.error(`오류 발생: ${result.errors.length}건`);
    for (const err of result.errors) {
      console.error(`  - Employee #${err.employeeId}: ${err.error}`);
    }
  }

  console.log(`[${new Date().toISOString()}] 배치 완료`);
}

main()
  .catch((e) => {
    console.error("배치 실행 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
