import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "사용자명과 비밀번호를 입력하세요." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "사용자명 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const sessionId = await createSession(user.id);

    const response = NextResponse.json({
      message: "로그인 성공",
      user: { id: user.id, username: user.username },
    });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
