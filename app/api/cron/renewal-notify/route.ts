/**
 * POST /api/cron/renewal-notify
 *
 * 라이선스 만료 D-70 / D-30 / D-15 / D-7 시점에 담당자에게 알림을 발송한다.
 * EC2 호스트 cron에서 매일 호출한다.
 *
 * 알림 채널:
 *   - Slack: SLACK_WEBHOOK_URL 환경변수가 설정된 경우 발송
 *   - Email: SMTP_* 환경변수가 설정된 경우 발송
 *
 * 담당자 결정:
 *   - LicenseOwner.userId   → Slack DM (recipient = userId 문자열)
 *   - LicenseOwner.orgUnitId → 해당 조직 활성 구성원 전체 이메일
 *
 * 인증: Authorization: Bearer <CRON_SECRET>
 * 응답: { success: true, notified: number, skipped: number, logs: summary[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackMessage, sendEmail } from "@/lib/notification";

const NOTICE_DAYS = [70, 30, 15, 7] as const;

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** 오늘 기준으로 정확히 daysAhead 일 후인 날짜 범위(하루)를 반환 */
function dayRange(daysAhead: number): { gte: Date; lt: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + daysAhead);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let notified = 0;
  let skipped = 0;
  const summary: {
    licenseId: number;
    licenseName: string;
    daysLeft: number;
    channel: string;
    recipient: string;
    status: "SUCCESS" | "FAILED";
    error?: string;
  }[] = [];

  for (const days of NOTICE_DAYS) {
    const range = dayRange(days);

    const licenses = await prisma.license.findMany({
      where: { expiryDate: range },
      include: {
        owners: true,
      },
    });

    for (const license of licenses) {
      const message = buildMessage(license.name, days, license.expiryDate!);

      // 담당자가 없으면 SLACK_WEBHOOK_URL로 채널 전송
      if (license.owners.length === 0) {
        const result = await sendSlackMessage(message);
        const logEntry = await prisma.notificationLog.create({
          data: {
            licenseId: license.id,
            channel: "SLACK",
            recipient: "webhook_channel",
            status: result.ok ? "SUCCESS" : "FAILED",
            errorMsg: result.ok ? null : result.error,
          },
        });
        summary.push({
          licenseId: license.id,
          licenseName: license.name,
          daysLeft: days,
          channel: "SLACK",
          recipient: "webhook_channel",
          status: logEntry.status as "SUCCESS" | "FAILED",
          ...(!result.ok && { error: result.error }),
        });
        result.ok ? notified++ : skipped++;
        continue;
      }

      for (const owner of license.owners) {
        // ── userId 기반: Slack DM (recipient = username) ───────────────
        if (owner.userId !== null) {
          const user = await prisma.user.findUnique({
            where: { id: owner.userId },
            select: { username: true },
          });
          const recipient = user?.username ?? String(owner.userId);

          const result = await sendSlackMessage(
            `[담당자 알림] ${message}\n담당자: ${recipient}`
          );

          await prisma.notificationLog.create({
            data: {
              licenseId: license.id,
              channel: "SLACK",
              recipient,
              status: result.ok ? "SUCCESS" : "FAILED",
              errorMsg: result.ok ? null : result.error,
            },
          });

          summary.push({
            licenseId: license.id,
            licenseName: license.name,
            daysLeft: days,
            channel: "SLACK",
            recipient,
            status: result.ok ? "SUCCESS" : "FAILED",
            ...(!result.ok && { error: result.error }),
          });
          result.ok ? notified++ : skipped++;
        }

        // ── orgUnitId 기반: 조직 구성원 이메일 ─────────────────────────
        if (owner.orgUnitId !== null) {
          const members = await prisma.employee.findMany({
            where: {
              orgUnitId: owner.orgUnitId,
              status: "ACTIVE",
              email: { not: null },
            },
            select: { email: true },
          });

          const emails = members
            .map((m) => m.email)
            .filter((e): e is string => e !== null);

          if (emails.length === 0) {
            skipped++;
            continue;
          }

          const result = await sendEmail({
            to: emails,
            subject: `[라이선스 갱신 알림] ${license.name} — D-${days}`,
            text: message,
          });

          for (const email of emails) {
            await prisma.notificationLog.create({
              data: {
                licenseId: license.id,
                channel: "EMAIL",
                recipient: email,
                status: result.ok ? "SUCCESS" : "FAILED",
                errorMsg: result.ok ? null : result.error,
              },
            });

            summary.push({
              licenseId: license.id,
              licenseName: license.name,
              daysLeft: days,
              channel: "EMAIL",
              recipient: email,
              status: result.ok ? "SUCCESS" : "FAILED",
              ...(!result.ok && { error: result.error }),
            });
          }
          result.ok ? notified++ : skipped++;
        }
      }
    }
  }

  console.log(`[cron/renewal-notify] 완료 (${now.toISOString()}) — 성공: ${notified}, 실패/스킵: ${skipped}`);

  return NextResponse.json({
    success: true,
    notified,
    skipped,
    logs: summary,
  });
}

function buildMessage(licenseName: string, daysLeft: number, expiryDate: Date): string {
  const dateStr = expiryDate.toISOString().slice(0, 10);
  return `⚠️ 라이선스 만료 D-${daysLeft} 알림\n라이선스: ${licenseName}\n만료일: ${dateStr}\n갱신 여부를 확인해주세요.`;
}
