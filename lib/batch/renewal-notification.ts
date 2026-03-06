/**
 * 라이선스 갱신 알림 스케줄러
 *
 * - renewalDate(또는 renewalDateManual) 기준 D-70, D-30, D-15, D-7 시점에 알림
 * - LicenseOwner에 등록된 담당자에게 발송 시도
 * - NotificationLog에 성공/실패 모두 기록
 * - 폐쇄망이므로 Slack/Email은 환경변수 설정 시에만 시도
 *
 * 실행: `npx tsx scripts/renewal-notification.ts`
 * 스케줄: 매일 1회 (cron 또는 docker exec)
 */

import type { PrismaClient } from "@/generated/prisma/client";

const NOTIFY_DAYS = [70, 30, 15, 7] as const;

export interface NotificationResult {
  checkedLicenses: number;
  notificationsSent: number;
  notificationsFailed: number;
  details: {
    licenseId: number;
    licenseName: string;
    daysUntilRenewal: number;
    recipients: { recipient: string; channel: string; status: string; error?: string }[];
  }[];
}

/** 갱신일 계산: renewalDateManual 우선, 없으면 renewalDate */
function getEffectiveRenewalDate(license: {
  renewalDate: Date | null;
  renewalDateManual: Date | null;
}): Date | null {
  return license.renewalDateManual ?? license.renewalDate ?? null;
}

/** 오늘과 갱신일 사이 일수 (양수 = 갱신일이 미래) */
function daysUntil(target: Date): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
}

/** Slack Webhook 발송 시도 (SLACK_WEBHOOK_URL 환경변수 필요) */
async function trySendSlack(
  webhookUrl: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    if (!res.ok) {
      return { success: false, error: `Slack HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 이메일 발송 시도 (SMTP 미구현 — 폐쇄망 제약, 로그만 기록) */
async function trySendEmail(
  _recipient: string,
  _subject: string,
  _body: string
): Promise<{ success: boolean; error?: string }> {
  // 폐쇄망 환경: SMTP 서버 미설정 시 실패 기록
  // 향후 사내 SMTP 연동 시 이 함수를 구현
  return { success: false, error: "SMTP 미설정 (폐쇄망)" };
}

/** 동일 라이선스 + 동일 D-day에 오늘 이미 발송한 기록이 있는지 확인 */
async function alreadyNotifiedToday(
  prisma: PrismaClient,
  licenseId: number,
  dDay: number
): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const count = await prisma.notificationLog.count({
    where: {
      licenseId,
      status: "SUCCESS",
      sentAt: { gte: todayStart, lte: todayEnd },
      // recipient 필드에 D-day 정보를 포함하여 중복 방지
      recipient: { contains: `D-${dDay}` },
    },
  });
  return count > 0;
}

export async function runRenewalNotification(
  prisma: PrismaClient
): Promise<NotificationResult> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  // 갱신 대상: NOT_RENEWING이 아니고, 갱신일이 설정된 라이선스
  const licenses = await prisma.license.findMany({
    where: {
      renewalStatus: { not: "NOT_RENEWING" },
      OR: [
        { renewalDate: { not: null } },
        { renewalDateManual: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      renewalDate: true,
      renewalDateManual: true,
      renewalStatus: true,
      owners: {
        select: {
          userId: true,
          orgUnitId: true,
        },
      },
    },
  });

  const result: NotificationResult = {
    checkedLicenses: licenses.length,
    notificationsSent: 0,
    notificationsFailed: 0,
    details: [],
  };

  for (const license of licenses) {
    const renewalDate = getEffectiveRenewalDate(license);
    if (!renewalDate) continue;

    const remaining = daysUntil(renewalDate);

    // D-day 매칭: 정확히 D-70, D-30, D-15, D-7
    const matchedDay = NOTIFY_DAYS.find((d) => d === remaining);
    if (matchedDay === undefined) continue;

    // 오늘 이미 발송했으면 스킵
    const alreadySent = await alreadyNotifiedToday(prisma, license.id, matchedDay);
    if (alreadySent) continue;

    const message =
      `[라이선스 갱신 알림] "${license.name}" 갱신일까지 ${matchedDay}일 남았습니다. ` +
      `(갱신일: ${renewalDate.toISOString().split("T")[0]}, 상태: ${license.renewalStatus})`;

    const recipients: NotificationResult["details"][0]["recipients"] = [];

    // 담당자가 없으면 기본 알림 로그만
    if (license.owners.length === 0) {
      // 담당자 미지정 — 관리자에게 알림 (로그 기록)
      const logEntry = await prisma.notificationLog.create({
        data: {
          licenseId: license.id,
          channel: "LOG",
          recipient: `[D-${matchedDay}] 담당자 미지정`,
          status: "SUCCESS",
        },
      });
      recipients.push({
        recipient: "담당자 미지정",
        channel: "LOG",
        status: "SUCCESS",
      });
      result.notificationsSent++;
    }

    // 담당자별 발송 시도
    for (const owner of license.owners) {
      const recipientLabel = owner.userId
        ? `User#${owner.userId}`
        : `OrgUnit#${owner.orgUnitId}`;

      // Slack 발송 시도
      if (slackWebhookUrl) {
        const slackResult = await trySendSlack(slackWebhookUrl, message);
        await prisma.notificationLog.create({
          data: {
            licenseId: license.id,
            channel: "SLACK",
            recipient: `[D-${matchedDay}] ${recipientLabel}`,
            status: slackResult.success ? "SUCCESS" : "FAILED",
            errorMsg: slackResult.error ?? null,
          },
        });
        recipients.push({
          recipient: recipientLabel,
          channel: "SLACK",
          status: slackResult.success ? "SUCCESS" : "FAILED",
          error: slackResult.error,
        });
        if (slackResult.success) result.notificationsSent++;
        else result.notificationsFailed++;
      }

      // 이메일 발송 시도 (현재 비활성 — 폐쇄망)
      const emailResult = await trySendEmail(recipientLabel, "라이선스 갱신 알림", message);
      await prisma.notificationLog.create({
        data: {
          licenseId: license.id,
          channel: "EMAIL",
          recipient: `[D-${matchedDay}] ${recipientLabel}`,
          status: emailResult.success ? "SUCCESS" : "FAILED",
          errorMsg: emailResult.error ?? null,
        },
      });
      recipients.push({
        recipient: recipientLabel,
        channel: "EMAIL",
        status: emailResult.success ? "SUCCESS" : "FAILED",
        error: emailResult.error,
      });
      if (emailResult.success) result.notificationsSent++;
      else result.notificationsFailed++;
    }

    result.details.push({
      licenseId: license.id,
      licenseName: license.name,
      daysUntilRenewal: remaining,
      recipients,
    });
  }

  return result;
}
