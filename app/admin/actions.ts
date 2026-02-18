"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type FormState = { error?: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("권한이 없습니다.");
  return user;
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as "ADMIN" | "USER";

  if (!username || !password) return { error: "사용자명과 비밀번호는 필수입니다." };
  if (password.length < 4) return { error: "비밀번호는 4자 이상이어야 합니다." };

  try {
    const hash = await hashPassword(password);
    await prisma.user.create({ data: { username, password: hash, role: role === "ADMIN" ? "ADMIN" : "USER" } });
  } catch {
    return { error: "이미 사용 중인 사용자명입니다." };
  }

  revalidatePath("/admin");
  return {};
}

export async function deleteUser(userId: number): Promise<FormState> {
  const me = await requireAdmin();
  if (me.id === userId) return { error: "자기 자신은 삭제할 수 없습니다." };

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return {};
}

export async function changePassword(userId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const password = formData.get("password") as string;
  if (!password || password.length < 4) return { error: "비밀번호는 4자 이상이어야 합니다." };

  const hash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
  revalidatePath("/admin");
  return {};
}

export async function updateRole(userId: number, role: "ADMIN" | "USER"): Promise<FormState> {
  const me = await requireAdmin();
  if (me.id === userId) return { error: "자신의 권한은 변경할 수 없습니다." };

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return {};
}
