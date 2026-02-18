import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSeats, deleteAllSeats } from "@/lib/license-seats";

type Params = { params: Promise<{ id: string }> };

// GET /api/licenses/:id — 라이선스 상세 조회
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const license = await prisma.license.findUnique({
      where: { id: Number(id) },
      include: {
        assignments: {
          include: { employee: true },
          orderBy: { assignedDate: "desc" },
        },
        seats: {
          include: {
            assignments: {
              where: { returnedDate: null },
              select: { employee: { select: { name: true } } },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: "라이선스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const activeAssignments = license.assignments.filter(
      (a) => a.returnedDate === null
    );

    return NextResponse.json({
      ...license,
      assignedQuantity: activeAssignments.length,
      remainingQuantity: license.totalQuantity - activeAssignments.length,
    });
  } catch (error) {
    console.error("Failed to fetch license:", error);
    return NextResponse.json(
      { error: "라이선스 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/licenses/:id — 라이선스 수정
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name, key, totalQuantity, price, purchaseDate, expiryDate,
      contractDate, noticePeriodDays, adminName, description,
    } = body;

    const licenseId = Number(id);
    const isVolumeLicense = body.isVolumeLicense;

    const license = await prisma.$transaction(async (tx) => {
      const existing = await tx.license.findUnique({
        where: { id: licenseId },
        select: { isVolumeLicense: true },
      });

      // Risk 3: Block type conversion if active assignments exist
      if (existing && isVolumeLicense !== undefined && existing.isVolumeLicense !== isVolumeLicense) {
        const activeAssignments = await tx.assignment.count({
          where: { licenseId, returnedDate: null },
        });
        if (activeAssignments > 0) {
          throw new Error(
            `활성 배정이 ${activeAssignments}건 있어 라이선스 유형을 변경할 수 없습니다. 먼저 모든 배정을 해제하세요.`
          );
        }
      }

      const updated = await tx.license.update({
        where: { id: licenseId },
        data: {
          ...(name !== undefined && { name }),
          ...(key !== undefined && { key: isVolumeLicense ? (key || null) : null }),
          ...(isVolumeLicense !== undefined && { isVolumeLicense }),
          ...(totalQuantity !== undefined && { totalQuantity: Number(totalQuantity) }),
          ...(price !== undefined && { price: price != null ? Number(price) : null }),
          ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
          ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
          ...(contractDate !== undefined && { contractDate: contractDate ? new Date(contractDate) : null }),
          ...(noticePeriodDays !== undefined && { noticePeriodDays: noticePeriodDays != null ? Number(noticePeriodDays) : null }),
          ...(adminName !== undefined && { adminName: adminName || null }),
          ...(description !== undefined && { description: description || null }),
        },
      });

      if (existing && isVolumeLicense !== undefined) {
        if (!existing.isVolumeLicense && isVolumeLicense) {
          await deleteAllSeats(tx, licenseId);
        } else if (existing.isVolumeLicense && !isVolumeLicense) {
          await syncSeats(tx, licenseId, totalQuantity !== undefined ? Number(totalQuantity) : updated.totalQuantity);
        }
      }

      if (!updated.isVolumeLicense && totalQuantity !== undefined) {
        await syncSeats(tx, licenseId, Number(totalQuantity));
      }

      return updated;
    });

    return NextResponse.json(license);
  } catch (error) {
    console.error("Failed to update license:", error);
    const message = error instanceof Error ? error.message : "라이선스 수정에 실패했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

// DELETE /api/licenses/:id — 라이선스 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.license.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "라이선스가 삭제되었습니다." });
  } catch (error) {
    console.error("Failed to delete license:", error);
    return NextResponse.json(
      { error: "라이선스 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}