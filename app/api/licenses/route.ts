import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSeats } from "@/lib/license-seats";

// GET /api/licenses — 라이선스 목록 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const licenses = await prisma.license.findMany({
      include: {
        assignments: {
          where: { returnedDate: null },
        },
        seats: {
          select: { id: true, key: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = licenses.map((license) => ({
      ...license,
      assignedQuantity: license.assignments.length,
      remainingQuantity: license.totalQuantity - license.assignments.length,
      missingKeyCount: license.isVolumeLicense ? 0 : license.seats.filter((s) => s.key === null).length,
      assignments: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch licenses:", error);
    return NextResponse.json(
      { error: "라이선스 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/licenses — 라이선스 등록
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json();
    const {
      name, key, totalQuantity, price, purchaseDate, expiryDate,
      contractDate, noticePeriodDays, adminName, description,
    } = body;

    if (!name || totalQuantity === undefined || !purchaseDate) {
      return NextResponse.json(
        { error: "name, totalQuantity, purchaseDate는 필수입니다." },
        { status: 400 }
      );
    }

    const isVolumeLicense = body.isVolumeLicense ?? false;
    const qty = Number(totalQuantity);

    const license = await prisma.$transaction(async (tx) => {
      const created = await tx.license.create({
        data: {
          name,
          key: isVolumeLicense ? (key || null) : null,
          isVolumeLicense,
          totalQuantity: qty,
          price: price != null ? Number(price) : null,
          purchaseDate: new Date(purchaseDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          contractDate: contractDate ? new Date(contractDate) : null,
          noticePeriodDays: noticePeriodDays != null ? Number(noticePeriodDays) : null,
          adminName: adminName || null,
          description: description || null,
        },
      });

      if (!isVolumeLicense) {
        await syncSeats(tx, created.id, qty);
      }

      return created;
    });

    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    console.error("Failed to create license:", error);
    return NextResponse.json(
      { error: "라이선스 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}