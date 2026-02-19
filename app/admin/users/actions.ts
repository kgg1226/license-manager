"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type FormState = { error?: string; success?: string };

// ── 사용자 생성 ──────────────────────────────────────────────────────────────
export async function createUser(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const name     = (formData.get("name")     as string)?.trim() || undefined;
  const email    = (formData.get("email")    as string)?.trim() || undefined;
  const role     = formData.get("role") as "ADMIN" | "USER";

  if (!username || !password)
    return { error: "사용자명과 비밀번호는 필수입니다." };
  if (password.length < 4)
    return { error: "비밀번호는 4자 이상이어야 합니다." };

  try {
    const hash = await hashPassword(password);
    await prisma.user.create({
      data: {
        username,
        password: hash,
        role: role === "ADMIN" ? "ADMIN" : "USER",
        ...(name  ? { name  } : {}),
        ...(email ? { email } : {}),
      },
    });
  } catch {
    return { error: "이미 사용 중인 사용자명 또는 이메일입니다." };
  }

  revalidatePath("/admin/users");
  return { success: "사용자가 생성되었습니다." };
}

// ── 사용자 수정 (이름/이메일/역할) ──────────────────────────────────────────
export async function updateUser(
  userId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireAdmin();

  const name  = (formData.get("name")  as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const role  = formData.get("role") as "ADMIN" | "USER";

  // 자신의 관리자 권한은 박탈 불가
  if (me.id === userId && role !== "ADMIN")
    return { error: "자신의 관리자 권한은 제거할 수 없습니다." };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name:  name  ?? null,
        email: email ?? null,
        role:  role === "ADMIN" ? "ADMIN" : "USER",
      },
    });
  } catch {
    return { error: "이미 사용 중인 이메일입니다." };
  }

  revalidatePath("/admin/users");
  return { success: "수정되었습니다." };
}

// ── 비밀번호 재설정 ──────────────────────────────────────────────────────────
export async function changePassword(
  userId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const password = formData.get("password") as string;
  if (!password || password.length < 4)
    return { error: "비밀번호는 4자 이상이어야 합니다." };

  const hash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });

  revalidatePath("/admin/users");
  return { success: "비밀번호가 변경되었습니다." };
}

// ── 활성/비활성 토글 ─────────────────────────────────────────────────────────
export async function toggleUserActive(
  userId: number,
  currentIsActive: boolean
): Promise<FormState> {
  const me = await requireAdmin();

  if (me.id === userId)
    return { error: "자신의 계정은 비활성화할 수 없습니다." };

  await prisma.user.update({
    where: { id: userId },
    data:  { isActive: !currentIsActive },
  });

  // 비활성화 시 기존 세션 전부 파기
  if (currentIsActive) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  revalidatePath("/admin/users");
  return {};
}

// ── 사용자 삭제 ──────────────────────────────────────────────────────────────
export async function deleteUser(userId: number): Promise<FormState> {
  const me = await requireAdmin();

  if (me.id === userId)
    return { error: "자기 자신은 삭제할 수 없습니다." };

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
  return {};
}
