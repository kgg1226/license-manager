import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

// 재귀적으로 하위 OrgUnit id 목록 수집
async function collectDescendantIds(rootId: number): Promise<number[]> {
  const result: number[] = [];
  const queue: number[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    const children = await prisma.orgUnit.findMany({
      where: { parentId: current },
      select: { id: true },
    });
    queue.push(...children.map((c) => c.id));
  }
  return result;
}

// PUT /api/org/units/:id — 조직 수정 { name?, parentId?, sortOrder? }
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, parentId, sortOrder } = body;

    const unit = await prisma.orgUnit.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(parentId !== undefined && { parentId: parentId != null ? Number(parentId) : null }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
      include: { children: true },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Failed to update org unit:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 존재하는 부서명입니다" }, { status: 409 });
    }
    return NextResponse.json({ error: "조직 수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/org/units/:id — cascade 삭제 + 구성원 미소속 처리 + AuditLog
// body: { confirm: "삭제하겠습니다" }
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const unitId = Number(id);

    const body = await request.json().catch(() => ({}));
    if (body.confirm !== "삭제하겠습니다") {
      return NextResponse.json({ error: "확인 문구가 일치하지 않습니다" }, { status: 400 });
    }

    const unit = await prisma.orgUnit.findUnique({
      where: { id: unitId },
      select: { id: true, name: true },
    });
    if (!unit) {
      return NextResponse.json({ error: "조직을 찾을 수 없습니다." }, { status: 404 });
    }

    // 삭제 대상 트리 수집
    const allIds = await collectDescendantIds(unitId);

    const affectedMemberCount = await prisma.employee.count({
      where: { orgUnitId: { in: allIds } },
    });

    await prisma.$transaction(async (tx) => {
      // 구성원 미소속으로 이동
      await tx.employee.updateMany({
        where: { orgUnitId: { in: allIds } },
        data: { orgUnitId: null },
      });

      // 하위부터 삭제 (leaf → root 순)
      const ordered = [...allIds].reverse();
      for (const oid of ordered) {
        await tx.orgUnit.delete({ where: { id: oid } });
      }

      await writeAuditLog(tx, {
        entityType: "ORG_UNIT",
        entityId: unitId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          deletedTree: allIds,
          affectedMemberCount,
          deletedAt: new Date().toISOString(),
        },
      });
    });

    return NextResponse.json({ success: true, affectedMemberCount });
  } catch (error) {
    console.error("Failed to delete org unit:", error);
    return NextResponse.json({ error: "조직 삭제에 실패했습니다." }, { status: 500 });
  }
}
