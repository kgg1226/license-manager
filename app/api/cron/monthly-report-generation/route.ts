/**
 * POST /api/cron/monthly-report-generation
 *
 * BE-033: 월별 자산 보고서 자동 생성 배치
 * 매월 1일 호출하여 전월 데이터 기준으로 보고서 데이터를 생성하고 AuditLog에 기록한다.
 *
 * 인증: Authorization: Bearer <CRON_SECRET>
 * 요청: POST (body 없음, 전월 자동 계산) 또는 { "yearMonth": "2026-02" } 로 특정 월 지정
 * 응답: { success: true, period, summary, notification }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** 전월을 YYYY-MM 형식으로 반환 */
function getPreviousMonth(): string {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = String(prevMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function POST(request: NextRequest) {
  // 인증: ADMIN 세션 또는 CRON_SECRET
  const cronAuth = isCronAuthorized(request);
  if (!cronAuth) {
    // ADMIN 세션으로도 실행 허용
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
  }

  try {
    // yearMonth: body에서 가져오거나 전월 자동 계산
    let yearMonth: string;
    try {
      const body = await request.json();
      yearMonth = body.yearMonth ?? getPreviousMonth();
    } catch {
      yearMonth = getPreviousMonth();
    }

    // 형식 검증
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      return NextResponse.json(
        { error: "유효하지 않은 기간입니다. 형식: YYYY-MM" },
        { status: 400 },
      );
    }

    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // ── 데이터 집계 ──
    const assets = await prisma.asset.findMany({
      where: {
        createdAt: { lte: endDate },
        OR: [
          { status: { not: "DISPOSED" } },
          { status: "DISPOSED", updatedAt: { gte: startDate } },
        ],
      },
      include: {
        assignee: { select: { id: true, name: true } },
        orgUnit: { select: { id: true, name: true } },
      },
    });

    let totalMonthlyCost = 0;
    const typeSummary: Record<string, number> = {};
    for (const asset of assets) {
      const mc = asset.monthlyCost ? Number(asset.monthlyCost) : 0;
      totalMonthlyCost += mc;
      typeSummary[asset.type] = (typeSummary[asset.type] ?? 0) + 1;
    }

    const summary = {
      period: yearMonth,
      assetCount: assets.length,
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      byType: typeSummary,
    };

    // ── AuditLog 기록 ──
    await prisma.auditLog.create({
      data: {
        entityType: "REPORT",
        entityId: 0,
        action: "GENERATED",
        actor: cronAuth ? "CRON" : "ADMIN",
        actorType: cronAuth ? "SYSTEM" : "USER",
        details: JSON.stringify({
          type: "monthly-report",
          ...summary,
        }),
      },
    });

    // ── 알림 발송 (Slack/Email) ──
    let notificationResult = null;
    try {
      const { sendSlackMessage } = await import("@/lib/notification");
      if (typeof sendSlackMessage === "function") {
        await sendSlackMessage(
          `📊 ${yearMonth} 월별 자산 보고서가 생성되었습니다.\n` +
          `총 자산: ${assets.length}건 | 월 비용: ${totalMonthlyCost.toLocaleString("ko-KR")} KRW\n` +
          `다운로드: /api/reports/monthly/${yearMonth}/excel`
        );
        notificationResult = "slack_sent";
      }
    } catch {
      // Slack 미설정 시 무시
      notificationResult = "notification_skipped";
    }

    return NextResponse.json({
      success: true,
      ...summary,
      notification: notificationResult,
    });
  } catch (error) {
    console.error("Monthly report generation failed:", error);
    return NextResponse.json(
      { error: "보고서 생성에 실패했습니다.", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
