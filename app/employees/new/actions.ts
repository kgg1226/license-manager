// 변경: title/companyId/orgId/subOrgId 파싱 추가, 자동 할당 전체를 트랜잭션으로 묶어 불일치 방지

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
  const title = formData.get("title") as string;
  const companyIdRaw = formData.get("companyId") as string;
  const orgIdRaw = formData.get("orgId") as string;
  const subOrgIdRaw = formData.get("subOrgId") as string;

  const errors: Record<string, string> = {};

  if (!name?.trim()) errors.name = "이름은 필수입니다.";
  if (!department?.trim()) errors.department = "부서는 필수입니다.";

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const companyId = companyIdRaw ? Number(companyIdRaw) : null;
  const orgId = orgIdRaw ? Number(orgIdRaw) : null;
  const subOrgId = subOrgIdRaw ? Number(subOrgIdRaw) : null;

  try {
    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          name: name.trim(),
          department: department.trim(),
          email: email?.trim() || null,
          title: title?.trim() || null,
          companyId,
          orgId,
          subOrgId,
        },
      });

      // Auto-assign licenses from default groups
      const defaultGroups = await tx.licenseGroup.findMany({
        where: { isDefault: true },
        include: { members: { include: { license: true } } },
      });

      for (const group of defaultGroups) {
        for (const member of group.members) {
          const license = member.license;
          const activeCount = await tx.assignment.count({
            where: { licenseId: license.id, returnedDate: null },
          });

          // KEY_BASED: max 1 auto-assignment; VOLUME/NO_KEY: check total quantity
          if (license.licenseType === "KEY_BASED" && activeCount >= 1) continue;
          if (license.licenseType !== "KEY_BASED" && activeCount >= license.totalQuantity) continue;

          const keyType = license.licenseType === "VOLUME" ? "Volume Key" : license.licenseType === "KEY_BASED" ? "Individual Key" : "No Key";
          const reason = `Auto-assigned via Group: ${group.name} (${keyType})`;
          const assignment = await tx.assignment.create({
            data: { licenseId: license.id, employeeId: employee.id, reason },
          });

          await tx.assignmentHistory.create({
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
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { errors: { email: "이미 등록된 이메일입니다." } };
    }
    return { message: "조직원 등록에 실패했습니다." };
  }

  redirect("/employees");
}
