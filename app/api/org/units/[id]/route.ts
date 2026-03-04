import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PUT /api/org/units/:id — 조직 수정 { name?, parentId? }
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, parentId } = body;

    const unit = await prisma.orgUnit.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(parentId !== undefined && { parentId: parentId ? Number(parentId) : null }),
      },
      include: { children: true },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Failed to update org unit:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "동일한 이름의 조직이 이미 존재합니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "조직 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/org/units/:id — 조직 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const unitId = Number(id);

    // 하위 조직이 있는 경우 삭제 거부
    const childCount = await prisma.orgUnit.count({ where: { parentId: unitId } });
    if (childCount > 0) {
      return NextResponse.json(
        { error: "하위 조직이 있는 조직은 삭제할 수 없습니다. 먼저 하위 조직을 삭제하세요." },
        { status: 400 }
      );
    }

    await prisma.orgUnit.delete({ where: { id: unitId } });

    return NextResponse.json({ message: "조직이 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete org unit:", error);
    return NextResponse.json({ error: "조직 삭제에 실패했습니다." }, { status: 500 });
  }
}
