import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/licenses/:id — 라이선스 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const license = await prisma.license.findUnique({
      where: { id: Number(id) },
      include: {
        assignments: {
          include: { employee: true },
          orderBy: { assignedDate: "desc" },
        },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: "라이선스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const activeAssignments = license.assignments.filter(
      (a) => a.returnedDate === null
    );

    return NextResponse.json({
      ...license,
      assignedQuantity: activeAssignments.length,
      remainingQuantity: license.totalQuantity - activeAssignments.length,
    });
  } catch (error) {
    console.error("Failed to fetch license:", error);
    return NextResponse.json(
      { error: "라이선스 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/licenses/:id — 라이선스 수정
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, key, totalQuantity, purchaseDate, expiryDate, description } =
      body;

    const license = await prisma.license.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(key !== undefined && { key }),
        ...(totalQuantity !== undefined && {
          totalQuantity: Number(totalQuantity),
        }),
        ...(purchaseDate !== undefined && {
          purchaseDate: new Date(purchaseDate),
        }),
        ...(expiryDate !== undefined && {
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(license);
  } catch (error) {
    console.error("Failed to update license:", error);
    return NextResponse.json(
      { error: "라이선스 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/licenses/:id — 라이선스 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.license.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "라이선스가 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete license:", error);
    return NextResponse.json(
      { error: "라이선스 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}