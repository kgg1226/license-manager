/**
 * POST /api/cron/offboard
 *
 * OFFBOARDING 상태이고 offboardingUntil이 경과한 구성원을 삭제한다.
 * EC2 호스트 cron에서 매일 호출한다.
 *
 * 인증: Authorization: Bearer <CRON_SECRET>
 * 응답: { success: true, deleted: number, details: { id, name }[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { isCronAuthorized } from "@/lib/cron-auth";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // offboardingUntil이 현재 시각 이전인 OFFBOARDING 구성원 조회
  const targets = await prisma.employee.findMany({
    where: {
      status: "OFFBOARDING",
      offboardingUntil: { lte: now },
    },
    select: {
      id: true,
      name: true,
      email: true,
      companyId: true,
      orgUnitId: true,
      offboardingUntil: true,
    },
  });

  const deleted: { id: number; name: string }[] = [];

  for (const employee of targets) {
    try {
      await prisma.$transaction(async (tx) => {
        // AssignmentHistory 먼저 정리
        await tx.assignmentHistory.deleteMany({
          where: { employeeId: employee.id },
        });

        // 구성원 삭제
        await tx.employee.delete({ where: { id: employee.id } });

        // Tombstone AuditLog (SYSTEM actor)
        await writeAuditLog(tx, {
          entityType: "EMPLOYEE",
          entityId: employee.id,
          action: "DELETED",
          actor: "SYSTEM",
          actorType: "SYSTEM",
          details: {
            tombstone: true,
            reason: "OFFBOARDING_EXPIRED",
            name: employee.name,
            email: employee.email,
            companyId: employee.companyId,
            orgUnitId: employee.orgUnitId,
            offboardingUntil: employee.offboardingUntil?.toISOString(),
            deletedAt: now.toISOString(),
          },
        });
      });

      deleted.push({ id: employee.id, name: employee.name });
    } catch (err) {
      console.error(`[cron/offboard] Failed to delete employee ${employee.id}:`, err);
    }
  }

  console.log(`[cron/offboard] ${deleted.length}명 자동 삭제 완료 (${now.toISOString()})`);

  return NextResponse.json({
    success: true,
    deleted: deleted.length,
    details: deleted,
  });
}
