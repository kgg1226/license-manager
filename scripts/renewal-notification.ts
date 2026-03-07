/**
 * 라이선스 갱신 알림 — 독립 실행 스크립트
 *
 * 실행: npx tsx scripts/renewal-notification.ts
 * 스케줄 예시 (cron): 0 9 * * * cd /app && npx tsx scripts/renewal-notification.ts
 *
 * 환경변수:
 *   SLACK_WEBHOOK_URL — Slack 알림 활성화 (선택)
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { runRenewalNotification } from "../lib/batch/renewal-notification";

const prisma = new PrismaClient();

async function main() {
  console.log(`[${new Date().toISOString()}] 라이선스 갱신 알림 스케줄러 시작`);

  const result = await runRenewalNotification(prisma);

  console.log(`확인된 라이선스: ${result.checkedLicenses}개`);
  console.log(`알림 발송 성공: ${result.notificationsSent}건`);
  console.log(`알림 발송 실패: ${result.notificationsFailed}건`);

  if (result.details.length > 0) {
    console.log(`\n알림 대상:`);
    for (const detail of result.details) {
      console.log(`  - [D-${detail.daysUntilRenewal}] ${detail.licenseName} (ID: ${detail.licenseId})`);
      for (const r of detail.recipients) {
        const status = r.status === "SUCCESS" ? "✓" : "✗";
        console.log(`    ${status} ${r.channel} → ${r.recipient}${r.error ? ` (${r.error})` : ""}`);
      }
    }
  }

  console.log(`\n[${new Date().toISOString()}] 스케줄러 완료`);
}

main()
  .catch((e) => {
    console.error("스케줄러 실행 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
