// BE-HW-002: POST /api/assets/[id]/assign — 하드웨어 자산 할당

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  handleValidationError,
  handlePrismaError,
  vNumReq,
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

    const employeeId = vNumReq(body.employeeId, "조직원 ID", { min: 1, integer: true });
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

      // 2. 이미 할당된 경우 에러
      if (asset.assigneeId !== null) {
        return { error: "이미 다른 조직원에게 할당된 자산입니다.", status: 409 };
      }

      // 3. Employee 존재 확인
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, name: true },
      });

      if (!employee) {
        return { error: "조직원을 찾을 수 없습니다.", status: 404 };
      }

      // 4. Asset 업데이트: assigneeId, status = IN_USE
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          assigneeId: employeeId,
          status: "IN_USE",
        },
        select: { id: true, name: true, assigneeId: true, status: true },
      });

      // 5. AssetAssignmentHistory 기록
      const history = await tx.assetAssignmentHistory.create({
        data: {
          assetId,
          employeeId,
          action: "ASSIGNED",
          reason,
          performedBy: user.id,
        },
      });

      // 6. AuditLog 기록
      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "ASSET_ASSIGNED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          employeeId,
          employeeName: employee.name,
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
    console.error("Failed to assign asset:", error);
    return NextResponse.json(
      { error: "자산 할당에 실패했습니다." },
      { status: 500 },
    );
  }
}
