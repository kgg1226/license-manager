import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

  try {
    const body = await request.json();
    const { name, description, isDefault, licenseIds } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "그룹명은 필수입니다." }, { status: 400 });
    }

    const group = await prisma.licenseGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: isDefault ?? false,
        ...(licenseIds?.length && {
          members: {
            create: licenseIds.map((licenseId: number) => ({ licenseId })),
          },
        }),
      },
      include: { members: { include: { license: true } } },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create group:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 존재하는 그룹명입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "그룹 생성에 실패했습니다." }, { status: 500 });
  }
}
