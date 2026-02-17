"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function updateGroup(
  id: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const isDefault = formData.get("isDefault") === "on";
  const licenseIds = formData.getAll("licenseIds").map(Number).filter(Boolean);

  const errors: Record<string, string> = {};

  if (!name?.trim()) {
    errors.name = "그룹명은 필수입니다.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.licenseGroup.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isDefault,
        },
      });

      // Replace members: delete all, then re-create
      await tx.licenseGroupMember.deleteMany({ where: { licenseGroupId: id } });

      if (licenseIds.length > 0) {
        await tx.licenseGroupMember.createMany({
          data: licenseIds.map((licenseId) => ({
            licenseGroupId: id,
            licenseId,
          })),
        });
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { errors: { name: "이미 존재하는 그룹명입니다." } };
    }
    return { message: "그룹 수정에 실패했습니다." };
  }

  redirect("/settings/groups");
}

export async function deleteGroup(id: number): Promise<FormState> {
  try {
    await prisma.licenseGroup.delete({ where: { id } });
  } catch {
    return { message: "그룹 삭제에 실패했습니다." };
  }

  redirect("/settings/groups");
}
