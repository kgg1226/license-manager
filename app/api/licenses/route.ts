import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/licenses — 라이선스 목록 조회
export async function GET() {
  try {
    const licenses = await prisma.license.findMany({
      include: {
        assignments: {
          where: { returnedDate: null },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = licenses.map((license) => ({
      ...license,
      assignedQuantity: license.assignments.length,
      remainingQuantity: license.totalQuantity - license.assignments.length,
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
  try {
    const body = await request.json();
    const { name, key, totalQuantity, purchaseDate, expiryDate, description } =
      body;

    if (!name || totalQuantity === undefined || !purchaseDate) {
      return NextResponse.json(
        { error: "name, totalQuantity, purchaseDate는 필수입니다." },
        { status: 400 }
      );
    }

    const license = await prisma.license.create({
      data: {
        name,
        key: key || null,
        totalQuantity: Number(totalQuantity),
        purchaseDate: new Date(purchaseDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        description: description || null,
      },
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