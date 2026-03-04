import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// 재귀적으로 하위 OrgUnit 정보 수집 (id, name, depth)
async function collectDescendants(
  rootId: number,
  depth = 0
): Promise<{ id: number; name: string; depth: number }[]> {
  const children = await prisma.orgUnit.findMany({
    where: { parentId: rootId },
    select: { id: true, name: true },
  });

  const result: { id: number; name: string; depth: number }[] = [];
  for (const child of children) {
    result.push({ id: child.id, name: child.name, depth: depth + 1 });
    const sub = await collectDescendants(child.id, depth + 1);
    result.push(...sub);
  }
  return result;
}

// GET /api/org/units/:id/delete-preview — 삭제 전 영향 범위 미리보기
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const unitId = Number(id);

    const unit = await prisma.orgUnit.findUnique({
      where: { id: unitId },
      select: { id: true, name: true },
    });
    if (!unit) {
      return NextResponse.json({ error: "조직을 찾을 수 없습니다." }, { status: 404 });
    }

    const descendants = await collectDescendants(unitId);
    const allIds = [unitId, ...descendants.map((d) => d.id)];

    const affectedMemberCount = await prisma.employee.count({
      where: { orgUnitId: { in: allIds } },
    });

    return NextResponse.json({
      target: { id: unit.id, name: unit.name },
      descendants,
      descendantCount: descendants.length,
      affectedMemberCount,
    });
  } catch (error) {
    console.error("Failed to preview org unit deletion:", error);
    return NextResponse.json({ error: "삭제 미리보기에 실패했습니다." }, { status: 500 });
  }
}
