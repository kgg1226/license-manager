// BE-HW-003: POST /api/assets/[id]/unassign — 하드웨어 자산 회수

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  handleValidationError,
  handlePrismaError,
  vStr,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    const body = await request.json();

    const reason = vStr(body.reason, 500);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Asset 존재 확인
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        select: { id: true, name: true, status: true, assigneeId: true },
      });

      if (!asset) {
        return { error: "자산을 찾을 수 없습니다.", status: 404 };
      }

      // 2. 현재 할당자 없으면 에러
      if (asset.assigneeId === null) {
        return { error: "할당된 조직원이 없습니다.", status: 400 };
      }

      // 3. 이전 assigneeId 기록
      const previousAssigneeId = asset.assigneeId;

      // 조직원 이름 조회 (audit용)
      const employee = await tx.employee.findUnique({
        where: { id: previousAssigneeId },
        select: { name: true },
      });

      // 4. Asset 업데이트: assigneeId = null, status = IN_STOCK
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          assigneeId: null,
          status: "IN_STOCK",
        },
        select: { id: true, name: true, assigneeId: true, status: true },
      });

      // 5. AssetAssignmentHistory 기록
      const history = await tx.assetAssignmentHistory.create({
        data: {
          assetId,
          employeeId: previousAssigneeId,
          action: "UNASSIGNED",
          reason,
          performedBy: user.id,
        },
      });

      // 6. AuditLog 기록
      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "ASSET_UNASSIGNED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          employeeId: previousAssigneeId,
          employeeName: employee?.name,
          reason,
        },
      });

      return {
        success: true,
        asset: updatedAsset,
        history: {
          id: history.id,
          action: history.action,
          employeeId: history.employeeId,
        },
      };
    });

    // 트랜잭션 결과 확인 — 에러인 경우
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, {
      notFoundMessage: "자산을 찾을 수 없습니다.",
    });
    if (pErr) return pErr;
    console.error("Failed to unassign asset:", error);
    return NextResponse.json(
      { error: "자산 회수에 실패했습니다." },
      { status: 500 },
    );
  }
}
