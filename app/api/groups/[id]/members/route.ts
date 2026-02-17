import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/groups/:id/members — 그룹에 라이선스 추가
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const groupId = Number(id);
    const { licenseIds } = await request.json();

    if (!Array.isArray(licenseIds) || licenseIds.length === 0) {
      return NextResponse.json({ error: "추가할 라이선스를 선택하세요." }, { status: 400 });
    }

    const group = await prisma.licenseGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }

    // Get existing members to skip duplicates
    const existing = await prisma.licenseGroupMember.findMany({
      where: { licenseGroupId: groupId, licenseId: { in: licenseIds } },
      select: { licenseId: true },
    });
    const existingSet = new Set(existing.map((e) => e.licenseId));
    const newIds = (licenseIds as number[]).filter((id) => !existingSet.has(id));

    if (newIds.length > 0) {
      await prisma.licenseGroupMember.createMany({
        data: newIds.map((licenseId) => ({
          licenseGroupId: groupId,
          licenseId,
        })),
      });
    }

    const updated = await prisma.licenseGroup.findUnique({
      where: { id: groupId },
      include: { members: { include: { license: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to add members:", error);
    return NextResponse.json({ error: "라이선스 추가에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/groups/:id/members — 그룹에서 라이선스 제거 (기존 배정은 유지)
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const groupId = Number(id);
    const { licenseIds } = await request.json();

    if (!Array.isArray(licenseIds) || licenseIds.length === 0) {
      return NextResponse.json({ error: "제거할 라이선스를 선택하세요." }, { status: 400 });
    }

    await prisma.licenseGroupMember.deleteMany({
      where: {
        licenseGroupId: groupId,
        licenseId: { in: licenseIds },
      },
    });

    const updated = await prisma.licenseGroup.findUnique({
      where: { id: groupId },
      include: { members: { include: { license: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to remove members:", error);
    return NextResponse.json({ error: "라이선스 제거에 실패했습니다." }, { status: 500 });
  }
}
