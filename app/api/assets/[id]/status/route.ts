// BE-023: PATCH /api/assets/[id]/status — 자산 상태 변경

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  handleValidationError,
  handlePrismaError,
  vEnumReq,
  vStr,
} from "@/lib/validation";

const ASSET_STATUSES = ["ACTIVE", "INACTIVE", "DISPOSED"] as const;

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/assets/[id]/status ──

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    const body = await request.json();

    const statusVal = vEnumReq(body.status, "상태", ASSET_STATUSES);
    const memoVal = vStr(body.memo, 500);

    const existing = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, name: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.status === statusVal) {
      return NextResponse.json(
        { error: `이미 ${statusVal} 상태입니다.` },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: assetId },
        data: { status: statusVal },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          field: "status",
          from: existing.status,
          to: statusVal,
          memo: memoVal,
        },
      });
    });

    return NextResponse.json({ id: assetId, status: statusVal });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, {
      notFoundMessage: "자산을 찾을 수 없습니다.",
    });
    if (pErr) return pErr;
    console.error("Failed to update asset status:", error);
    return NextResponse.json(
      { error: "자산 상태 변경에 실패했습니다." },
      { status: 500 },
    );
  }
}
