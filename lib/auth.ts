import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}

export function getSessionToken(cookieStore: Awaited<ReturnType<typeof cookies>>): string | undefined {
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = getSessionToken(cookieStore);
  if (!token) return null;

  const session = await validateSession(token);
  if (!session) return null;

  return { id: session.user.id, username: session.user.username };
}

export { SESSION_COOKIE, SESSION_DURATION_MS };
