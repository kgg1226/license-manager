import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, handlePrismaError, vStr, vStrReq, vBool } from "@/lib/validation";

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
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();

    // ── 입력 검증 ──
    const nameVal = body.name !== undefined ? vStrReq(body.name, "그룹명", 200) : undefined;
    const descriptionVal = body.description !== undefined ? vStr(body.description, 2000) : undefined;
    const isDefaultVal = body.isDefault !== undefined ? vBool(body.isDefault) : undefined;

    const group = await prisma.$transaction(async (tx) => {
      const updated = await tx.licenseGroup.update({
        where: { id: Number(id) },
        data: {
          ...(nameVal !== undefined && { name: nameVal }),
          ...(descriptionVal !== undefined && { description: descriptionVal }),
          ...(isDefaultVal !== undefined && { isDefault: isDefaultVal }),
        },
        include: { members: { include: { license: true } } },
      });

      await writeAuditLog(tx, {
        entityType: "GROUP",
        entityId: updated.id,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: updated.name },
      });

      return updated;
    });

    return NextResponse.json(group);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, { uniqueMessage: "이미 존재하는 그룹명입니다." });
    if (pErr) return pErr;
    console.error("Failed to update group:", error);
    return NextResponse.json({ error: "그룹 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/groups/:id — 그룹 삭제 (멤버십만 제거, 기존 배정 유지)
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const groupId = Number(id);

    await prisma.$transaction(async (tx) => {
      const target = await tx.licenseGroup.findUnique({ where: { id: groupId }, select: { name: true } });
      await tx.licenseGroup.delete({ where: { id: groupId } });

      await writeAuditLog(tx, {
        entityType: "GROUP",
        entityId: groupId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: target?.name, deletedAt: new Date().toISOString() },
      });
    });

    return NextResponse.json({ message: "그룹이 삭제되었습니다." });
  } catch (error) {
    const pErr2 = handlePrismaError(error);
    if (pErr2) return pErr2;
    console.error("Failed to delete group:", error);
    return NextResponse.json({ error: "그룹 삭제에 실패했습니다." }, { status: 500 });
  }
}
