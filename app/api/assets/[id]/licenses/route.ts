// BE-072: 자산-라이선스 연결 API
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

// GET /api/assets/[id]/licenses — 자산에 연결된 라이선스 목록
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const assetId = Number(id);

    const links = await prisma.assetLicenseLink.findMany({
      where: { assetId },
      include: {
        license: {
          select: { id: true, name: true, licenseType: true, expiryDate: true, totalQuantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Failed to fetch asset-license links:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "연결 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/assets/[id]/licenses — 자산에 라이선스 연결
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    const body = await request.json();
    const licenseId = Number(body.licenseId);
    const note = body.note?.trim() || null;

    if (!licenseId || isNaN(licenseId)) {
      return NextResponse.json({ error: "licenseId는 필수입니다." }, { status: 400 });
    }

    // 존재 확인
    const [asset, license] = await Promise.all([
      prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, name: true } }),
      prisma.license.findUnique({ where: { id: licenseId }, select: { id: true, name: true } }),
    ]);

    if (!asset) return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });
    if (!license) return NextResponse.json({ error: "라이선스를 찾을 수 없습니다." }, { status: 404 });

    const link = await prisma.$transaction(async (tx) => {
      const created = await tx.assetLicenseLink.create({
        data: { assetId, licenseId, note, createdBy: user.id },
        include: {
          license: { select: { id: true, name: true, licenseType: true } },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "LICENSE_LINKED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { assetName: asset.name, licenseName: license.name, licenseId },
      });

      return created;
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    // Unique constraint violation
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 연결된 라이선스입니다." }, { status: 409 });
    }
    console.error("Failed to link license:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "라이선스 연결에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/assets/[id]/licenses — 연결 해제 (body: { licenseId })
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    const body = await request.json();
    const licenseId = Number(body.licenseId);

    if (!licenseId || isNaN(licenseId)) {
      return NextResponse.json({ error: "licenseId는 필수입니다." }, { status: 400 });
    }

    const link = await prisma.assetLicenseLink.findUnique({
      where: { assetId_licenseId: { assetId, licenseId } },
      include: {
        asset: { select: { name: true } },
        license: { select: { name: true } },
      },
    });

    if (!link) return NextResponse.json({ error: "연결을 찾을 수 없습니다." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.assetLicenseLink.delete({
        where: { assetId_licenseId: { assetId, licenseId } },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: assetId,
        action: "LICENSE_UNLINKED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { assetName: link.asset.name, licenseName: link.license.name, licenseId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unlink license:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "연결 해제에 실패했습니다." }, { status: 500 });
  }
}
