/**
 * OFFBOARDING 자동 삭제 배치
 *
 * - offboardingUntil이 현재 시각 이전인 OFFBOARDING 구성원을 삭제
 * - 삭제 전: 활성 배정 전부 반납 처리 + AssignmentHistory 기록
 * - 삭제 후: AuditLog에 tombstone 기록
 *
 * 실행: `npx tsx scripts/offboarding-cleanup.ts`
 * 스케줄: 매일 1회 (cron 또는 docker exec)
 */

import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface CleanupResult {
  processedCount: number;
  deletedIds: number[];
  errors: { employeeId: number; error: string }[];
}

export async function runOffboardingCleanup(
  prisma: PrismaClient
): Promise<CleanupResult> {
  const now = new Date();

  // 유예 기간 경과한 OFFBOARDING 구성원 조회
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

  if (targets.length === 0) {
    return { processedCount: 0, deletedIds: [], errors: [] };
  }

  const deletedIds: number[] = [];
  const errors: { employeeId: number; error: string }[] = [];

  for (const target of targets) {
    try {
      await prisma.$transaction(async (tx: Tx) => {
        // 1. 활성 배정 반납 처리
        const activeAssignments = await tx.assignment.findMany({
          where: { employeeId: target.id, returnedDate: null },
          include: { license: { select: { name: true } } },
        });

        for (const assignment of activeAssignments) {
          await tx.assignment.update({
            where: { id: assignment.id },
            data: { returnedDate: now },
          });

          await tx.assignmentHistory.create({
            data: {
              assignmentId: assignment.id,
              licenseId: assignment.licenseId,
              employeeId: target.id,
              action: "RETURNED",
              reason: "OFFBOARDING 유예 기간 만료 자동 반납",
            },
          });
        }

        // 2. AssignmentHistory orphan 정리
        await tx.assignmentHistory.deleteMany({
          where: { employeeId: target.id },
        });

        // 3. 구성원 삭제
        await tx.employee.delete({ where: { id: target.id } });

        // 4. Tombstone AuditLog
        await tx.auditLog.create({
          data: {
            entityType: "EMPLOYEE",
            entityId: target.id,
            action: "DELETED",
            actor: "SYSTEM",
            actorType: "SYSTEM",
            actorId: null,
            details: JSON.stringify({
              tombstone: true,
              reason: "OFFBOARDING 유예 기간 만료 자동 삭제",
              name: target.name,
              email: target.email,
              companyId: target.companyId,
              orgUnitId: target.orgUnitId,
              offboardingUntil: target.offboardingUntil?.toISOString(),
              deletedAt: now.toISOString(),
              revokedAssignments: activeAssignments.map((a) => ({
                licenseId: a.licenseId,
                licenseName: a.license.name,
              })),
            }),
          },
        });
      });

      deletedIds.push(target.id);
    } catch (err) {
      errors.push({
        employeeId: target.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    processedCount: targets.length,
    deletedIds,
    errors,
  };
}
