import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%^&*";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function generateTempPassword(): string {
  // 각 문자군에서 최소 1개 보장 후 나머지 랜덤으로 채움 (12자)
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  for (let i = chars.length; i < 12; i++) {
    chars.push(pick(ALL));
  }
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// POST /api/admin/users/:id/reset-password — 임시 비밀번호 발급
export async function POST(request: NextRequest, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const userId = Number(id);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (!target) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashed,
          mustChangePassword: true,
        },
      });

      // 기존 세션 파기
      await tx.session.deleteMany({ where: { userId } });

      await writeAuditLog(tx, {
        entityType: "USER",
        entityId: userId,
        action: "PASSWORD_RESET",
        actor: me.username,
        actorType: "USER",
        actorId: me.id,
        details: {
          targetUsername: target.username,
          resetBy: me.username,
          resetAt: new Date().toISOString(),
        },
      });
    });

    return NextResponse.json({ tempPassword });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json({ error: "비밀번호 초기화에 실패했습니다." }, { status: 500 });
  }
}
