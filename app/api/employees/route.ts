import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/employees — 조직원 목록 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const employees = await prisma.employee.findMany({
      include: {
        assignments: {
          where: { returnedDate: null },
          include: { license: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = employees.map((emp) => ({
      ...emp,
      activeAssignments: emp.assignments.length,
      assignments: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "조직원 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/employees — 조직원 등록
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json();
    const { name, department, email } = body;

    if (!name || !department) {
      return NextResponse.json(
        { error: "name, department는 필수입니다." },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        department,
        email: email || null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create employee:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "조직원 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}