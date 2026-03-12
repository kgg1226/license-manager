// BE-HW-004: GET /api/assets/[id]/assignment-history — 할당/회수 이력 조회

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const assetId = Number(id);

    // 자산 존재 확인
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "자산을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const histories = await prisma.assetAssignmentHistory.findMany({
      where: { assetId },
      include: {
        employee: {
          select: { id: true, name: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // performedBy (userId) 조회 — User 테이블에서 username 가져오기
    const performedByIds = histories
      .map((h) => h.performedBy)
      .filter((id): id is number => id !== null);

    const uniquePerformedByIds = [...new Set(performedByIds)];
    const performers =
      uniquePerformedByIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: uniquePerformedByIds } },
            select: { id: true, username: true },
          })
        : [];

    const performerMap = new Map(performers.map((p) => [p.id, p]));

    const result = histories.map((h) => ({
      id: h.id,
      action: h.action,
      reason: h.reason,
      createdAt: h.createdAt,
      employee: h.employee,
      performedBy: h.performedBy
        ? performerMap.get(h.performedBy) ?? { id: h.performedBy, username: "unknown" }
        : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to fetch assignment history:", error);
    return NextResponse.json(
      { error: "할당 이력 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
