import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

export const SESSION_COOKIE = "session_token";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { id, userId, expiresAt },
  });

  return id;
}

export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: token } });
    return null;
  }

  // 비활성화된 사용자의 세션은 즉시 파기
  if (!session.user.isActive) {
    await prisma.session.delete({ where: { id: token } });
    return null;
  }

  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}

export function getSessionToken(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): string | undefined {
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = getSessionToken(cookieStore);
  if (!token) return null;

  const session = await validateSession(token);
  if (!session) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
  };
}

/**
 * 서버 컴포넌트·서버 액션 공통 가드.
 * 미인증 → /login 리다이렉트, 비관리자 → /licenses 리다이렉트.
 * ADMIN인 경우 현재 유저 정보를 반환한다.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/licenses");
  return user;
}
