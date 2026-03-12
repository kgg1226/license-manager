// BE-HW-006: PATCH /api/assets/[id]/status — 자산 상태 전환 (전환 매트릭스 + 자동 전환)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  handleValidationError,
  handlePrismaError,
  vEnumReq,
  vStr,
  ValidationError,
} from "@/lib/validation";

const ASSET_STATUSES = [
  "IN_STOCK",
  "IN_USE",
  "INACTIVE",
  "UNUSABLE",
  "PENDING_DISPOSAL",
  "DISPOSED",
] as const;

type AssetStatusType = (typeof ASSET_STATUSES)[number];

/**
 * 상태 전환 허용 매트릭스
 * - IN_STOCK/IN_USE/INACTIVE → INACTIVE: 허용
 * - INACTIVE → IN_STOCK: 허용 (복원)
 * - IN_STOCK/IN_USE/INACTIVE → UNUSABLE: 허용 (→ 자동 PENDING_DISPOSAL)
 * - PENDING_DISPOSAL → DISPOSED: 허용
 * - 기타 전환: 불가
 */
function isTransitionAllowed(
  current: AssetStatusType,
  requested: AssetStatusType,
): boolean {
  if (current === requested) return false;

  const activeStatuses: AssetStatusType[] = ["IN_STOCK", "IN_USE", "INACTIVE"];

  // IN_STOCK/IN_USE/INACTIVE → INACTIVE
  if (activeStatuses.includes(current) && requested === "INACTIVE") {
    return true;
  }

  // INACTIVE → IN_STOCK (복원)
  if (current === "INACTIVE" && requested === "IN_STOCK") {
    return true;
  }

  // IN_STOCK/IN_USE/INACTIVE → UNUSABLE (→ 자동 PENDING_DISPOSAL)
  if (activeStatuses.includes(current) && requested === "UNUSABLE") {
    return true;
  }

  // PENDING_DISPOSAL → DISPOSED
  if (current === "PENDING_DISPOSAL" && requested === "DISPOSED") {
    return true;
  }

  return false;
}

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

    const requestedStatus = vEnumReq(body.status, "상태", ASSET_STATUSES);
    const reason = vStr(body.reason, 500);

    // reason은 UNUSABLE, DISPOSED 전환 시 필수
    if (
      (requestedStatus === "UNUSABLE" || requestedStatus === "DISPOSED") &&
      !reason
    ) {
      throw new ValidationError("불용 처리 또는 폐기 완료 시 사유 입력은 필수입니다.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          name: true,
          status: true,
          assigneeId: true,
        },
      });

      if (!existing) {
        return { error: "자산을 찾을 수 없습니다.", httpStatus: 404 };
      }

      const currentStatus = existing.status as AssetStatusType;

      // 동일 상태
      if (currentStatus === requestedStatus) {
        return {
          error: `이미 ${requestedStatus} 상태입니다.`,
          httpStatus: 400,
        };
      }

      // 전환 규칙 검증
      if (!isTransitionAllowed(currentStatus, requestedStatus)) {
        return {
          error: "현재 상태에서 해당 전환은 허용되지 않습니다.",
          httpStatus: 400,
        };
      }

      const autoTransitions: string[] = [];
      let finalStatus: AssetStatusType = requestedStatus;

      // UNUSABLE 요청 시 → 즉시 PENDING_DISPOSAL로 자동 전환
      if (requestedStatus === "UNUSABLE") {
        autoTransitions.push("UNUSABLE", "PENDING_DISPOSAL");
        finalStatus = "PENDING_DISPOSAL";
      } else {
        autoTransitions.push(requestedStatus);
      }

      // IN_USE 상태에서 UNUSABLE로 전환 시 → 자동 회수
      if (currentStatus === "IN_USE" && requestedStatus === "UNUSABLE") {
        if (existing.assigneeId !== null) {
          // AssetAssignmentHistory 기록 (자동 회수)
          await tx.assetAssignmentHistory.create({
            data: {
              assetId,
              employeeId: existing.assigneeId,
              action: "UNASSIGNED",
              reason: `불용 처리로 인한 자동 회수 — ${reason}`,
              performedBy: user.id,
            },
          });

          // AuditLog: 자동 회수
          await writeAuditLog(tx, {
            entityType: "ASSET",
            entityId: assetId,
            action: "ASSET_UNASSIGNED",
            actor: user.username,
            actorType: "USER",
            actorId: user.id,
            details: {
              employeeId: existing.assigneeId,
              reason: "불용 처리로 인한 자동 회수",
              autoUnassign: true,
            },
          });
        }
      }

      // Asset 상태 업데이트
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          status: finalStatus,
          // IN_USE → UNUSABLE일 때 자동 회수
          ...(currentStatus === "IN_USE" &&
            requestedStatus === "UNUSABLE" && {
              assigneeId: null,
            }),
        },
        select: { id: true, name: true, status: true, assigneeId: true },
      });

      // AuditLog: 상태 변경
      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "STATUS_CHANGED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          previousStatus: currentStatus,
          requestedStatus,
          finalStatus,
          reason,
          autoTransitions,
        },
      });

      return {
        success: true,
        asset: updatedAsset,
        previousStatus: currentStatus,
        autoTransitions,
      };
    });

    // 트랜잭션 결과 확인 — 에러인 경우
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.httpStatus },
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
    console.error("Failed to update asset status:", error);
    return NextResponse.json(
      { error: "자산 상태 변경에 실패했습니다." },
      { status: 500 },
    );
  }
}
