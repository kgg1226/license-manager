import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; ownerId: string }> };

// DELETE /api/licenses/:id/owners/:ownerId — 담당자 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id, ownerId } = await params;
    const licenseId = Number(id);
    const ownerIdNum = Number(ownerId);

    const owner = await prisma.licenseOwner.findFirst({
      where: { id: ownerIdNum, licenseId },
    });
    if (!owner) {
      return NextResponse.json({ error: "담당자를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.licenseOwner.delete({ where: { id: ownerIdNum } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete owner:", error);
    return NextResponse.json({ error: "담당자 삭제에 실패했습니다." }, { status: 500 });
  }
}
