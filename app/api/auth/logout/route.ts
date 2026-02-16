import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionToken, deleteSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = getSessionToken(cookieStore);

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ message: "로그아웃 완료" });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout failed:", error);
    return NextResponse.json(
      { error: "로그아웃 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
