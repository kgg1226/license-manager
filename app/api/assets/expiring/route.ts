// BE-024: GET /api/assets/expiring — 만료 임박 자산 목록

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleValidationError, vNum } from "@/lib/validation";

// ── GET /api/assets/expiring?days=30 ──

export async function GET(request: NextRequest) {

  try {
    const withinDays =
      vNum(request.nextUrl.searchParams.get("days"), { min: 1, max: 365, integer: true }) ?? 30;

    const now = new Date();
    const deadline = new Date();
    deadline.setDate(now.getDate() + withinDays);

    const assets = await prisma.asset.findMany({
      where: {
        status: { in: ["IN_STOCK", "IN_USE", "INACTIVE"] },
        expiryDate: {
          gte: now,
          lte: deadline,
        },
      },
      include: {
        assignee: { select: { id: true, name: true } },
        orgUnit: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json({ assets, withinDays });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to fetch expiring assets:", error);
    return NextResponse.json(
      { error: "만료 임박 자산 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
