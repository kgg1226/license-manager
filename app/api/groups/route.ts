import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { handleValidationError, vStrReq, vStr, vBool, vNumArr } from "@/lib/validation";

// GET /api/groups — 그룹 목록 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const groups = await prisma.licenseGroup.findMany({
      include: {
        members: { include: { license: true } },
      },
      orderBy: { name: "asc" },
    });

    const result = groups.map((g) => ({
      ...g,
      licenseCount: g.members.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return NextResponse.json({ error: "그룹 목록을 불러오는데 실패했습니다." }, { status: 500 });
  }
}

// POST /api/groups — 그룹 생성
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();

    // ── 입력 검증 ──
    const nameVal = vStrReq(body.name, "그룹명", 200);
    const descriptionVal = vStr(body.description, 2000);
    const isDefaultVal = vBool(body.isDefault);
    const licenseIdsVal = body.licenseIds?.length
      ? vNumArr(body.licenseIds, "licenseIds")
      : [];

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.licenseGroup.create({
        data: {
          name: nameVal,
          description: descriptionVal,
          isDefault: isDefaultVal,
          ...(licenseIdsVal.length > 0 && {
            members: {
              create: licenseIdsVal.map((licenseId) => ({ licenseId })),
            },
          }),
        },
        include: { members: { include: { license: true } } },
      });

      await writeAuditLog(tx, {
        entityType: "GROUP",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: created.name, isDefault: created.isDefault },
      });

      return created;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: unknown) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to create group:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 존재하는 그룹명입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "그룹 생성에 실패했습니다." }, { status: 500 });
  }
}
