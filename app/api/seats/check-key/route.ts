import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/seats/check-key?key=xxx&excludeSeatId=123
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const key = request.nextUrl.searchParams.get("key");
  const excludeSeatId = request.nextUrl.searchParams.get("excludeSeatId");

  if (!key?.trim()) {
    return NextResponse.json({ duplicate: false });
  }

  const existing = await prisma.licenseSeat.findUnique({
    where: { key: key.trim() },
    select: {
      id: true,
      license: { select: { name: true } },
    },
  });

  if (!existing || (excludeSeatId && existing.id === Number(excludeSeatId))) {
    return NextResponse.json({ duplicate: false });
  }

  return NextResponse.json({
    duplicate: true,
    licenseName: existing.license.name,
  });
}
