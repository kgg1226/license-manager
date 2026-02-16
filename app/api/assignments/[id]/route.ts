import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// PUT /api/assignments/:id — 반납 처리
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(id) },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "할당 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (assignment.returnedDate) {
      return NextResponse.json(
        { error: "이미 반납 처리된 할당입니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.assignment.update({
      where: { id: Number(id) },
      data: { returnedDate: new Date() },
      include: {
        license: { select: { name: true } },
        employee: { select: { name: true } },
      },
    });

    return NextResponse.json({
      message: "반납 처리 완료",
      assignment: updated,
    });
  } catch (error) {
    console.error("Failed to return assignment:", error);
    return NextResponse.json(
      { error: "반납 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/:id — 할당 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.assignment.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "할당이 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return NextResponse.json(
      { error: "할당 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}