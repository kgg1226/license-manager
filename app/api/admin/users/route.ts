import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, vStrReq, vEnumReq } from "@/lib/validation";

const VALID_ROLES = ["ADMIN", "USER"] as const;

// GET /api/admin/users — 사용자 목록
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "사용자 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/admin/users — 사용자 생성
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();

    // ── 입력 검증 ──
    const usernameVal = vStrReq(body.username, "사용자명", 50);
    if (usernameVal.length < 2) {
      return NextResponse.json({ error: "사용자명은 2자 이상이어야 합니다." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(usernameVal)) {
      return NextResponse.json({ error: "사용자명은 영문, 숫자, ., _, - 만 사용 가능합니다." }, { status: 400 });
    }
    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json({ error: "비밀번호는 필수입니다." }, { status: 400 });
    }
    if (body.password.length < 8 || body.password.length > 128) {
      return NextResponse.json({ error: "비밀번호는 8자 이상 128자 이하여야 합니다." }, { status: 400 });
    }
    const roleVal = vEnumReq(body.role, "role", VALID_ROLES);

    const hash = await hashPassword(body.password);
    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: usernameVal,
          password: hash,
          role: roleVal,
        },
        select: { id: true, username: true, role: true, isActive: true, createdAt: true },
      });

      await writeAuditLog(tx, {
        entityType: "USER",
        entityId: newUser.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { targetUsername: newUser.username, role: newUser.role },
      });

      return newUser;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to create user:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 사용 중인 사용자명입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "사용자 생성에 실패했습니다." }, { status: 500 });
  }
}
