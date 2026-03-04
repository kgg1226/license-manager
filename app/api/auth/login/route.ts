import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from "@/lib/auth";
import {
  isRateLimited,
  recordFailure,
  clearAttempts,
  getRemainingLockSeconds,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "사용자명과 비밀번호를 입력하세요." },
        { status: 400 }
      );
    }

    // Rate limit: IP 기반 (5회 실패 → 15분 잠금)
    const rateLimitKey = `login:${ip}`;
    if (isRateLimited(rateLimitKey)) {
      const remaining = getRemainingLockSeconds(rateLimitKey);
      return NextResponse.json(
        { error: `로그인 시도 횟수를 초과했습니다. ${remaining}초 후 다시 시도하세요.` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !(await verifyPassword(password, user.password))) {
      const lockMs = recordFailure(rateLimitKey);
      // 로그인 실패 AuditLog (best-effort)
      await prisma.auditLog.create({
        data: {
          entityType: "USER",
          entityId: 0,
          action: "LOGIN_FAILED",
          details: JSON.stringify({ username, ip }),
        },
      }).catch(() => {});

      if (lockMs > 0) {
        return NextResponse.json(
          { error: `로그인 시도 횟수를 초과했습니다. ${Math.ceil(lockMs / 1000)}초 후 다시 시도하세요.` },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "사용자명 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      recordFailure(rateLimitKey);
      await prisma.auditLog.create({
        data: {
          entityType: "USER",
          entityId: user.id,
          action: "LOGIN_FAILED",
          details: JSON.stringify({ username, ip, reason: "inactive" }),
        },
      }).catch(() => {});
      return NextResponse.json(
        { error: "비활성화된 계정입니다. 관리자에게 문의하세요." },
        { status: 403 }
      );
    }

    // 로그인 성공 — 실패 카운터 초기화
    clearAttempts(rateLimitKey);

    const sessionId = await createSession(user.id);

    // 로그인 성공 AuditLog (best-effort)
    await prisma.auditLog.create({
      data: {
        entityType: "USER",
        entityId: user.id,
        action: "LOGIN",
        actor: user.username,
        details: JSON.stringify({ ip }),
      },
    }).catch(() => {});

    const response = NextResponse.json({
      message: "로그인 성공",
      user: { id: user.id, username: user.username },
    });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIE === "true",
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
