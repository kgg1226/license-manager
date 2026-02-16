import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/employees/:id — 조직원 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
        assignments: {
          include: { license: true },
          orderBy: { assignedDate: "desc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "조직원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to fetch employee:", error);
    return NextResponse.json(
      { error: "조직원 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/employees/:id — 조직원 수정
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, department, email } = body;

    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(email !== undefined && { email: email || null }),
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      { error: "조직원 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/:id — 조직원 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.employee.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "조직원이 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json(
      { error: "조직원 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}