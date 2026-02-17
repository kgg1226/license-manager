import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id — 그룹 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const group = await prisma.licenseGroup.findUnique({
      where: { id: Number(id) },
      include: { members: { include: { license: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Failed to fetch group:", error);
    return NextResponse.json({ error: "그룹 조회에 실패했습니다." }, { status: 500 });
  }
}

// PUT /api/groups/:id — 그룹 수정
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, isDefault } = body;

    const group = await prisma.licenseGroup.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isDefault !== undefined && { isDefault }),
      },
      include: { members: { include: { license: true } } },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Failed to update group:", error);
    return NextResponse.json({ error: "그룹 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/groups/:id — 그룹 삭제 (멤버십만 제거, 기존 배정 유지)
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.licenseGroup.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "그룹이 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete group:", error);
    return NextResponse.json({ error: "그룹 삭제에 실패했습니다." }, { status: 500 });
  }
}
