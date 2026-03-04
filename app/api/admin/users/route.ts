import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

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
    const { username, password, role } = body;

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "사용자명과 비밀번호는 필수입니다." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        username: username.trim(),
        password: hash,
        role: role === "ADMIN" ? "ADMIN" : "USER",
      },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 사용 중인 사용자명입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "사용자 생성에 실패했습니다." }, { status: 500 });
  }
}
