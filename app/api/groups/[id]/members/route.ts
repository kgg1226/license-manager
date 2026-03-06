import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, vNumArr } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// POST /api/groups/:id/members — 그룹에 라이선스 추가
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const groupId = Number(id);
    const body = await request.json();

    // ── 입력 검증 ──
    const licenseIds = vNumArr(body.licenseIds, "licenseIds");

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
    const newIds = licenseIds.filter((lid) => !existingSet.has(lid));

    if (newIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.licenseGroupMember.createMany({
          data: newIds.map((licenseId) => ({
            licenseGroupId: groupId,
            licenseId,
          })),
        });

        await writeAuditLog(tx, {
          entityType: "GROUP",
          entityId: groupId,
          action: "MEMBER_ADDED",
          actor: user.username,
          actorType: "USER",
          actorId: user.id,
          details: { addedLicenseIds: newIds, groupName: group.name },
        });
      });
    }

    const updated = await prisma.licenseGroup.findUnique({
      where: { id: groupId },
      include: { members: { include: { license: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to add members:", error);
    return NextResponse.json({ error: "라이선스 추가에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/groups/:id/members — 그룹에서 라이선스 제거 (기존 배정은 유지)
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const groupId = Number(id);
    const body = await request.json();

    // ── 입력 검증 ──
    const licenseIds = vNumArr(body.licenseIds, "licenseIds");

    await prisma.$transaction(async (tx) => {
      await tx.licenseGroupMember.deleteMany({
        where: {
          licenseGroupId: groupId,
          licenseId: { in: licenseIds },
        },
      });

      await writeAuditLog(tx, {
        entityType: "GROUP",
        entityId: groupId,
        action: "MEMBER_REMOVED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { removedLicenseIds: licenseIds },
      });
    });

    const updated = await prisma.licenseGroup.findUnique({
      where: { id: groupId },
      include: { members: { include: { license: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to remove members:", error);
    return NextResponse.json({ error: "라이선스 제거에 실패했습니다." }, { status: 500 });
  }
}
