/**
 * GET /api/notifications/history
 * 알림 발송 이력 조회 (최근 100건, 필터 지원)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // OK | FAIL
  const channel = searchParams.get("channel"); // EMAIL | SLACK
  const entityType = searchParams.get("entityType"); // LICENSE | ASSET
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (entityType) where.entityType = entityType;

  const logs = await prisma.notificationLog.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: limit,
    include: {
      license: { select: { id: true, name: true } },
      asset: { select: { id: true, name: true, type: true } },
    },
  });

  // 통계 요약
  const stats = {
    total: logs.length,
    ok: logs.filter((l) => l.status === "OK").length,
    fail: logs.filter((l) => l.status === "FAIL").length,
    byChannel: {
      EMAIL: logs.filter((l) => l.channel === "EMAIL").length,
      SLACK: logs.filter((l) => l.channel === "SLACK").length,
    },
  };

  return NextResponse.json({ logs, stats });
}
