"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type FormState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function createGroup(
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
    await prisma.licenseGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault,
        ...(licenseIds.length > 0 && {
          members: {
            create: licenseIds.map((licenseId) => ({ licenseId })),
          },
        }),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { errors: { name: "이미 존재하는 그룹명입니다." } };
    }
    return { message: "그룹 생성에 실패했습니다." };
  }

  redirect("/settings/groups");
}
