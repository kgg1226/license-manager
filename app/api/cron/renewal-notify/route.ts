/**
 * POST /api/cron/renewal-notify
 *
 * 라이선스/자산 만료 및 클라우드 갱신·해지통보 기한을 D-70/D-30/D-15/D-7 시점에 알림 발송.
 * EC2 호스트 cron에서 매일 호출한다.
 *
 * 알림 대상:
 *   1. License 만료 (expiryDate)
 *   2. Asset 만료 (expiryDate)
 *   3. Cloud 갱신 예정일 (CloudDetail.renewalDate)
 *   4. Cloud 해지 통보 기한 (CloudDetail.cancellationNoticeDate)
 *
 * 알림 채널:
 *   - Slack: SLACK_WEBHOOK_URL 환경변수가 설정된 경우 발송
 *   - Email: SMTP_* 환경변수가 설정된 경우 발송
 *
 * 담당자 결정 (License):
 *   - LicenseOwner.userId   → Slack DM (recipient = userId 문자열)
 *   - LicenseOwner.orgUnitId → 해당 조직 활성 구성원 전체 이메일
 *
 * 담당자 결정 (Asset):
 *   - Asset.assigneeId → 배정된 조직원 이메일
 *   - Asset.orgUnitId  → 해당 부서 활성 구성원 전체 이메일
 *   - 담당자 없으면 → Slack 채널 전송
 *
 * 담당자 결정 (Cloud 갱신/해지):
 *   - CloudDetail.adminEmail → 우선 발송 (관리자 이메일)
 *   - Asset.assigneeId → 보조 발송 (adminEmail과 다를 때만)
 *   - 둘 다 없으면 → Slack 채널 전송
 *
 * 인증: Authorization: Bearer <CRON_SECRET>
 * 응답: { success: true, notified: number, skipped: number, logs: summary[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackMessage, sendEmail } from "@/lib/notification";
import { isCronAuthorized } from "@/lib/cron-auth";

const NOTICE_DAYS = [70, 30, 15, 7] as const;

type NotifyLogEntry = {
  entityType: "LICENSE" | "ASSET";
  entityId: number;
  entityName: string;
  daysLeft: number;
  channel: string;
  recipient: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
};

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

function buildLicenseMessage(licenseName: string, daysLeft: number, expiryDate: Date): string {
  const dateStr = expiryDate.toISOString().slice(0, 10);
  return `⚠️ 라이선스 만료 D-${daysLeft} 알림\n라이선스: ${licenseName}\n만료일: ${dateStr}\n갱신 여부를 확인해주세요.`;
}

function buildAssetMessage(assetName: string, assetType: string, daysLeft: number, expiryDate: Date): string {
  const dateStr = expiryDate.toISOString().slice(0, 10);
  const typeLabel: Record<string, string> = {
    SOFTWARE: "소프트웨어",
    CLOUD: "클라우드",
    HARDWARE: "하드웨어",
    DOMAIN_SSL: "도메인/SSL",
    OTHER: "기타",
  };
  return `⚠️ 자산 만료 D-${daysLeft} 알림\n자산: ${assetName} (${typeLabel[assetType] ?? assetType})\n만료일: ${dateStr}\n갱신 또는 조치가 필요합니다.`;
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let notified = 0;
  let skipped = 0;
  const summary: NotifyLogEntry[] = [];

  // ── 1. License 만료 알림 ────────────────────────────────────────────
  for (const days of NOTICE_DAYS) {
    const range = dayRange(days);

    const licenses = await prisma.license.findMany({
      where: { expiryDate: range },
      include: { owners: true },
    });

    for (const license of licenses) {
      const message = buildLicenseMessage(license.name, days, license.expiryDate!);

      // 담당자 없음 → Slack 채널 전송
      if (license.owners.length === 0) {
        const result = await sendSlackMessage(message);
        await prisma.notificationLog.create({
          data: {
            licenseId: license.id,
            entityType: "LICENSE",
            channel: "SLACK",
            recipient: "webhook_channel",
            status: result.ok ? "SUCCESS" : "FAILED",
            errorMsg: result.ok ? null : result.error,
          },
        });
        summary.push({
          entityType: "LICENSE",
          entityId: license.id,
          entityName: license.name,
          daysLeft: days,
          channel: "SLACK",
          recipient: "webhook_channel",
          status: result.ok ? "SUCCESS" : "FAILED",
          ...(!result.ok && { error: result.error }),
        });
        result.ok ? notified++ : skipped++;
        continue;
      }

      for (const owner of license.owners) {
        // userId 기반: Slack DM
        if (owner.userId !== null) {
          const user = await prisma.user.findUnique({
            where: { id: owner.userId },
            select: { username: true },
          });
          const recipient = user?.username ?? String(owner.userId);
          const result = await sendSlackMessage(`[담당자 알림] ${message}\n담당자: ${recipient}`);

          await prisma.notificationLog.create({
            data: {
              licenseId: license.id,
              entityType: "LICENSE",
              channel: "SLACK",
              recipient,
              status: result.ok ? "SUCCESS" : "FAILED",
              errorMsg: result.ok ? null : result.error,
            },
          });
          summary.push({
            entityType: "LICENSE",
            entityId: license.id,
            entityName: license.name,
            daysLeft: days,
            channel: "SLACK",
            recipient,
            status: result.ok ? "SUCCESS" : "FAILED",
            ...(!result.ok && { error: result.error }),
          });
          result.ok ? notified++ : skipped++;
        }

        // orgUnitId 기반: 조직 구성원 이메일
        if (owner.orgUnitId !== null) {
          const members = await prisma.employee.findMany({
            where: {
              orgUnitId: owner.orgUnitId,
              status: "ACTIVE",
              email: { not: null },
            },
            select: { email: true },
          });
          const emails = members.map((m) => m.email).filter((e): e is string => e !== null);

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
                entityType: "LICENSE",
                channel: "EMAIL",
                recipient: email,
                status: result.ok ? "SUCCESS" : "FAILED",
                errorMsg: result.ok ? null : result.error,
              },
            });
            summary.push({
              entityType: "LICENSE",
              entityId: license.id,
              entityName: license.name,
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

  // ── 2. Asset 만료 알림 ──────────────────────────────────────────────
  for (const days of NOTICE_DAYS) {
    const range = dayRange(days);

    const assets = await prisma.asset.findMany({
      where: {
        expiryDate: range,
        status: { in: ["IN_STOCK", "IN_USE", "INACTIVE"] },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        orgUnit: { select: { id: true, name: true } },
      },
    });

    for (const asset of assets) {
      const message = buildAssetMessage(asset.name, asset.type, days, asset.expiryDate!);
      let sent = false;

      // assignee → 배정된 조직원 이메일
      if (asset.assignee?.email) {
        const result = await sendEmail({
          to: asset.assignee.email,
          subject: `[자산 만료 알림] ${asset.name} — D-${days}`,
          text: message,
        });

        await prisma.notificationLog.create({
          data: {
            assetId: asset.id,
            entityType: "ASSET",
            channel: "EMAIL",
            recipient: asset.assignee.email,
            status: result.ok ? "SUCCESS" : "FAILED",
            errorMsg: result.ok ? null : result.error,
          },
        });
        summary.push({
          entityType: "ASSET",
          entityId: asset.id,
          entityName: asset.name,
          daysLeft: days,
          channel: "EMAIL",
          recipient: asset.assignee.email,
          status: result.ok ? "SUCCESS" : "FAILED",
          ...(!result.ok && { error: result.error }),
        });
        result.ok ? notified++ : skipped++;
        sent = true;
      }

      // orgUnit → 부서 소속 활성 구성원 전체 이메일
      if (asset.orgUnitId !== null) {
        const members = await prisma.employee.findMany({
          where: {
            orgUnitId: asset.orgUnitId,
            status: "ACTIVE",
            email: { not: null },
            // assignee에게는 이미 보냈으므로 제외
            ...(asset.assigneeId ? { id: { not: asset.assigneeId } } : {}),
          },
          select: { email: true },
        });
        const emails = members.map((m) => m.email).filter((e): e is string => e !== null);

        if (emails.length > 0) {
          const result = await sendEmail({
            to: emails,
            subject: `[자산 만료 알림] ${asset.name} — D-${days}`,
            text: message,
          });

          for (const email of emails) {
            await prisma.notificationLog.create({
              data: {
                assetId: asset.id,
                entityType: "ASSET",
                channel: "EMAIL",
                recipient: email,
                status: result.ok ? "SUCCESS" : "FAILED",
                errorMsg: result.ok ? null : result.error,
              },
            });
            summary.push({
              entityType: "ASSET",
              entityId: asset.id,
              entityName: asset.name,
              daysLeft: days,
              channel: "EMAIL",
              recipient: email,
              status: result.ok ? "SUCCESS" : "FAILED",
              ...(!result.ok && { error: result.error }),
            });
          }
          result.ok ? notified++ : skipped++;
          sent = true;
        }
      }

      // 담당자도 부서도 없으면 → Slack 채널 전송
      if (!sent) {
        const result = await sendSlackMessage(message);
        await prisma.notificationLog.create({
          data: {
            assetId: asset.id,
            entityType: "ASSET",
            channel: "SLACK",
            recipient: "webhook_channel",
            status: result.ok ? "SUCCESS" : "FAILED",
            errorMsg: result.ok ? null : result.error,
          },
        });
        summary.push({
          entityType: "ASSET",
          entityId: asset.id,
          entityName: asset.name,
          daysLeft: days,
          channel: "SLACK",
          recipient: "webhook_channel",
          status: result.ok ? "SUCCESS" : "FAILED",
          ...(!result.ok && { error: result.error }),
        });
        result.ok ? notified++ : skipped++;
      }
    }
  }

  // ── 3 & 4. Cloud 갱신일 + 해지 통보 기한 알림 (notifyChannels 기반) ──
  const cloudDateFilters: Array<{
    dateField: "renewalDate" | "cancellationNoticeDate";
    subjectPrefix: string;
    buildMsg: (asset: { name: string }, cd: { platform?: string | null; autoRenew?: boolean | null; renewalDate?: Date | null }, dateStr: string, days: number) => string;
  }> = [
    {
      dateField: "renewalDate",
      subjectPrefix: "클라우드 갱신 알림",
      buildMsg: (asset, cd, dateStr, days) => {
        const autoRenewStr = cd.autoRenew ? " (자동갱신)" : "";
        return `⚠️ 클라우드 구독 갱신 D-${days} 알림\n서비스: ${asset.name} (${cd.platform ?? "클라우드"})${autoRenewStr}\n갱신 예정일: ${dateStr}\n갱신 여부를 확인해주세요.`;
      },
    },
    {
      dateField: "cancellationNoticeDate",
      subjectPrefix: "해지 통보 기한",
      buildMsg: (asset, cd, dateStr, days) => {
        const renewalStr = cd.renewalDate ? ` (갱신일: ${cd.renewalDate.toISOString().slice(0, 10)})` : "";
        return `🚨 해지 통보 기한 D-${days} 알림\n서비스: ${asset.name} (${cd.platform ?? "클라우드"})\n해지 통보 기한: ${dateStr}${renewalStr}\n해지 의향이 있으면 기한 내 통보가 필요합니다.`;
      },
    },
  ];

  for (const { dateField, subjectPrefix, buildMsg } of cloudDateFilters) {
    for (const days of NOTICE_DAYS) {
      const range = dayRange(days);

      const cloudAssets = await prisma.asset.findMany({
        where: {
          type: "CLOUD",
          status: { in: ["IN_STOCK", "IN_USE", "INACTIVE"] },
          cloudDetail: { [dateField]: range },
        },
        include: {
          cloudDetail: {
            select: { renewalDate: true, cancellationNoticeDate: true, adminEmail: true, adminSlackId: true, notifyChannels: true, platform: true, autoRenew: true },
          },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      for (const asset of cloudAssets) {
        const cd = asset.cloudDetail!;
        const channels = cd.notifyChannels ?? "EMAIL";

        // NONE → 알림 끄기
        if (channels === "NONE") { skipped++; continue; }

        const dateVal = cd[dateField]!;
        const dateStr = dateVal.toISOString().slice(0, 10);
        const message = buildMsg(asset, cd, dateStr, days);
        const subject = `[${subjectPrefix}] ${asset.name} — D-${days}`;
        let sent = false;

        // 이메일 발송 (EMAIL 또는 BOTH)
        if (channels === "EMAIL" || channels === "BOTH") {
          if (cd.adminEmail) {
            const result = await sendEmail({ to: cd.adminEmail, subject, text: message });
            await prisma.notificationLog.create({
              data: { assetId: asset.id, entityType: "ASSET", channel: "EMAIL", recipient: cd.adminEmail, status: result.ok ? "SUCCESS" : "FAILED", errorMsg: result.ok ? null : result.error },
            });
            summary.push({ entityType: "ASSET", entityId: asset.id, entityName: asset.name, daysLeft: days, channel: "EMAIL", recipient: cd.adminEmail, status: result.ok ? "SUCCESS" : "FAILED", ...(!result.ok && { error: result.error }) });
            result.ok ? notified++ : skipped++;
            sent = true;
          }

          // assignee 이메일 (adminEmail과 다를 때만 보조 발송)
          if (asset.assignee?.email && asset.assignee.email !== cd.adminEmail) {
            const result = await sendEmail({ to: asset.assignee.email, subject, text: message });
            await prisma.notificationLog.create({
              data: { assetId: asset.id, entityType: "ASSET", channel: "EMAIL", recipient: asset.assignee.email, status: result.ok ? "SUCCESS" : "FAILED", errorMsg: result.ok ? null : result.error },
            });
            summary.push({ entityType: "ASSET", entityId: asset.id, entityName: asset.name, daysLeft: days, channel: "EMAIL", recipient: asset.assignee.email, status: result.ok ? "SUCCESS" : "FAILED", ...(!result.ok && { error: result.error }) });
            result.ok ? notified++ : skipped++;
            sent = true;
          }
        }

        // Slack 발송 (SLACK 또는 BOTH)
        if (channels === "SLACK" || channels === "BOTH") {
          const slackRecipient = cd.adminSlackId ?? "webhook_channel";
          const slackMsg = cd.adminSlackId ? `<@${cd.adminSlackId}> ${message}` : message;
          const result = await sendSlackMessage(slackMsg);
          await prisma.notificationLog.create({
            data: { assetId: asset.id, entityType: "ASSET", channel: "SLACK", recipient: slackRecipient, status: result.ok ? "SUCCESS" : "FAILED", errorMsg: result.ok ? null : result.error },
          });
          summary.push({ entityType: "ASSET", entityId: asset.id, entityName: asset.name, daysLeft: days, channel: "SLACK", recipient: slackRecipient, status: result.ok ? "SUCCESS" : "FAILED", ...(!result.ok && { error: result.error }) });
          result.ok ? notified++ : skipped++;
          sent = true;
        }

        // 채널 설정했지만 실제 발송 안 됐으면 (이메일 없이 EMAIL만 선택 등) → Slack 채널 폴백
        if (!sent) {
          const result = await sendSlackMessage(message);
          await prisma.notificationLog.create({
            data: { assetId: asset.id, entityType: "ASSET", channel: "SLACK", recipient: "webhook_channel", status: result.ok ? "SUCCESS" : "FAILED", errorMsg: result.ok ? null : result.error },
          });
          summary.push({ entityType: "ASSET", entityId: asset.id, entityName: asset.name, daysLeft: days, channel: "SLACK", recipient: "webhook_channel", status: result.ok ? "SUCCESS" : "FAILED", ...(!result.ok && { error: result.error }) });
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
