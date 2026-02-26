// 변경: POST 핸들러 제거 — lib/assignment-actions.ts와 중복이며 시트 할당·감사 로그 누락으로 실제 앱과 불일치

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/assignments — 할당 목록 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const assignments = await prisma.assignment.findMany({
      include: {
        license: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true, department: true } },
      },
      orderBy: { assignedDate: "desc" },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return NextResponse.json(
      { error: "할당 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
