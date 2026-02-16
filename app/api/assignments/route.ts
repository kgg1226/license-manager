import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/assignments — 할당 목록 조회
export async function GET() {
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

// POST /api/assignments — 라이선스 할당
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseId, employeeId } = body;

    if (!licenseId || !employeeId) {
      return NextResponse.json(
        { error: "licenseId, employeeId는 필수입니다." },
        { status: 400 }
      );
    }

    // 라이선스 존재 여부 및 잔여 수량 확인
    const license = await prisma.license.findUnique({
      where: { id: Number(licenseId) },
      include: {
        assignments: {
          where: { returnedDate: null },
        },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: "라이선스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const activeCount = license.assignments.length;
    if (activeCount >= license.totalQuantity) {
      return NextResponse.json(
        {
          error: `잔여 수량이 없습니다. (총 ${license.totalQuantity}개 중 ${activeCount}개 할당됨)`,
        },
        { status: 400 }
      );
    }

    // 조직원 존재 여부 확인
    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "조직원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 동일 라이선스가 할당되어 있는지 확인
    const existing = await prisma.assignment.findFirst({
      where: {
        licenseId: Number(licenseId),
        employeeId: Number(employeeId),
        returnedDate: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 해당 조직원에게 같은 라이선스가 할당되어 있습니다." },
        { status: 409 }
      );
    }

    const assignment = await prisma.assignment.create({
      data: {
        licenseId: Number(licenseId),
        employeeId: Number(employeeId),
      },
      include: {
        license: { select: { name: true } },
        employee: { select: { name: true } },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return NextResponse.json(
      { error: "라이선스 할당에 실패했습니다." },
      { status: 500 }
    );
  }
}