// 변경: POST 핸들러 제거 — lib/assignment-actions.ts와 중복이며 시트 할당·감사 로그 누락으로 실제 앱과 불일치

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/assignments — 할당 목록 조회
// Query: ?licenseId=1&employeeId=1&active=true&page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseId = searchParams.get("licenseId");
    const employeeId = searchParams.get("employeeId");
    const active = searchParams.get("active");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? "50")));

    const where: Record<string, unknown> = {};
    if (licenseId) where.licenseId = Number(licenseId);
    if (employeeId) where.employeeId = Number(employeeId);
    if (active === "true") where.returnedDate = null;
    if (active === "false") where.returnedDate = { not: null };

    const [total, assignments] = await Promise.all([
      prisma.assignment.count({ where }),
      prisma.assignment.findMany({
        where,
        include: {
          license: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true, department: true } },
        },
        orderBy: { assignedDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: assignments,
    });
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return NextResponse.json(
      { error: "할당 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
