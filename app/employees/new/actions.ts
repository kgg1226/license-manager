"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function createEmployee(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name") as string;
  const department = formData.get("department") as string;
  const email = formData.get("email") as string;

  const errors: Record<string, string> = {};

  if (!name?.trim()) errors.name = "이름은 필수입니다.";
  if (!department?.trim()) errors.department = "부서는 필수입니다.";

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        department: department.trim(),
        email: email?.trim() || null,
      },
    });

    // Auto-assign licenses from default groups
    const defaultGroups = await prisma.licenseGroup.findMany({
      where: { isDefault: true },
      include: { members: { include: { license: true } } },
    });

    for (const group of defaultGroups) {
      for (const member of group.members) {
        const license = member.license;
        // Check remaining capacity
        const activeCount = await prisma.assignment.count({
          where: { licenseId: license.id, returnedDate: null },
        });
        if (activeCount >= license.totalQuantity) continue;

        const reason = `Auto-assigned via Group: ${group.name}`;
        const assignment = await prisma.assignment.create({
          data: {
            licenseId: license.id,
            employeeId: employee.id,
            reason,
          },
        });

        await prisma.assignmentHistory.create({
          data: {
            assignmentId: assignment.id,
            licenseId: license.id,
            employeeId: employee.id,
            action: "ASSIGNED",
            reason,
          },
        });
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { errors: { email: "이미 등록된 이메일입니다." } };
    }
    return { message: "조직원 등록에 실패했습니다." };
  }

  redirect("/employees");
}
