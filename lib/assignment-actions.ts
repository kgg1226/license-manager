"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  message: string;
  count?: number;
};

/**
 * Bulk-assign multiple licenses to an employee within a single transaction.
 */
export async function assignLicenses(
  employeeId: number,
  licenseIds: number[]
): Promise<ActionResult> {
  if (licenseIds.length === 0) return { success: false, message: "배정할 라이선스를 선택하세요." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new Error("조직원을 찾을 수 없습니다.");

      let assigned = 0;
      const skipped: string[] = [];

      for (const licenseId of licenseIds) {
        const license = await tx.license.findUnique({
          where: { id: licenseId },
          select: {
            name: true,
            totalQuantity: true,
            assignments: { where: { returnedDate: null }, select: { employeeId: true } },
          },
        });

        if (!license) { skipped.push(`ID ${licenseId}: 존재하지 않음`); continue; }

        // Already assigned to this employee
        if (license.assignments.some((a) => a.employeeId === employeeId)) {
          skipped.push(`${license.name}: 이미 배정됨`);
          continue;
        }

        // No remaining capacity
        if (license.assignments.length >= license.totalQuantity) {
          skipped.push(`${license.name}: 잔여 수량 없음`);
          continue;
        }

        const assignment = await tx.assignment.create({
          data: { licenseId, employeeId },
        });

        await tx.assignmentHistory.create({
          data: {
            assignmentId: assignment.id,
            licenseId,
            employeeId,
            action: "ASSIGNED",
            reason: "Manual assignment",
          },
        });

        assigned++;
      }

      return { assigned, skipped };
    });

    revalidatePath("/licenses");
    revalidatePath(`/employees/${employeeId}`);

    if (result.assigned === 0 && result.skipped.length > 0) {
      return { success: false, message: `배정 실패: ${result.skipped.join(", ")}` };
    }

    const msg = result.skipped.length > 0
      ? `${result.assigned}건 배정 완료 (${result.skipped.length}건 건너뜀: ${result.skipped.join(", ")})`
      : `${result.assigned}건 배정 완료`;

    return { success: true, message: msg, count: result.assigned };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "배정에 실패했습니다." };
  }
}

/**
 * Bulk-unassign multiple licenses from an employee within a single transaction.
 * Sets returnedDate instead of deleting, preserving history.
 */
export async function unassignLicenses(
  employeeId: number,
  assignmentIds: number[]
): Promise<ActionResult> {
  if (assignmentIds.length === 0) return { success: false, message: "해제할 배정을 선택하세요." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      let returned = 0;

      for (const assignmentId of assignmentIds) {
        const assignment = await tx.assignment.findUnique({
          where: { id: assignmentId },
        });

        if (!assignment || assignment.employeeId !== employeeId) continue;
        if (assignment.returnedDate) continue; // already returned

        await tx.assignment.update({
          where: { id: assignmentId },
          data: { returnedDate: new Date() },
        });

        await tx.assignmentHistory.create({
          data: {
            assignmentId,
            licenseId: assignment.licenseId,
            employeeId,
            action: "RETURNED",
            reason: "Manual unassignment",
          },
        });

        returned++;
      }

      return { returned };
    });

    revalidatePath("/licenses");
    revalidatePath(`/employees/${employeeId}`);

    if (result.returned === 0) {
      return { success: false, message: "해제할 수 있는 배정이 없습니다." };
    }

    return { success: true, message: `${result.returned}건 배정 해제 완료`, count: result.returned };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "배정 해제에 실패했습니다." };
  }
}
