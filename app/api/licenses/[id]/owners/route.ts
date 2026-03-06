import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, vNum } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// GET /api/licenses/:id/owners — 담당자 목록
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const licenseId = Number(id);

    const exists = await prisma.license.findUnique({ where: { id: licenseId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "라이선스를 찾을 수 없습니다." }, { status: 404 });

    const owners = await prisma.licenseOwner.findMany({
      where: { licenseId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(owners);
  } catch (error) {
    console.error("Failed to fetch owners:", error);
    return NextResponse.json({ error: "담당자 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/licenses/:id/owners — 담당자 추가 { userId? | orgUnitId? }
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const licenseId = Number(id);
    const body = await request.json();

    // ── 입력 검증 ──
    const userIdVal = vNum(body.userId, { min: 1, integer: true });
    const orgUnitIdVal = vNum(body.orgUnitId, { min: 1, integer: true });

    if ((userIdVal == null) === (orgUnitIdVal == null)) {
      return NextResponse.json(
        { error: "userId 또는 orgUnitId 중 하나만 지정해야 합니다." },
        { status: 400 }
      );
    }

    const exists = await prisma.license.findUnique({ where: { id: licenseId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "라이선스를 찾을 수 없습니다." }, { status: 404 });

    const owner = await prisma.$transaction(async (tx) => {
      const created = await tx.licenseOwner.create({
        data: {
          licenseId,
          userId: userIdVal,
          orgUnitId: orgUnitIdVal,
        },
      });

      await writeAuditLog(tx, {
        entityType: "LICENSE",
        entityId: licenseId,
        action: "OWNER_ADDED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { ownerId: created.id, userId: created.userId, orgUnitId: created.orgUnitId },
      });

      return created;
    });

    return NextResponse.json(owner, { status: 201 });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to add owner:", error);
    return NextResponse.json({ error: "담당자 추가에 실패했습니다." }, { status: 500 });
  }
}
