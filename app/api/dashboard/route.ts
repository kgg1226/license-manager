import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  aggregateDashboard,
  type AssetCategory,
  type LicenseRow,
  type AssetRow,
} from "@/lib/dashboard-aggregator";

const VALID_TYPES: AssetCategory[] = ["SOFTWARE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "OTHER"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const typeParam = searchParams.get("type")?.toUpperCase() as AssetCategory | undefined;

    // 유효성 검증
    if (typeParam && !VALID_TYPES.includes(typeParam)) {
      return NextResponse.json(
        { error: `유효하지 않은 자산 유형입니다. 허용값: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // License + Asset 병렬 조회
    const [licenses, assets] = await Promise.all([
      prisma.license.findMany({
        select: {
          id: true,
          name: true,
          licenseType: true,
          totalAmountKRW: true,
          paymentCycle: true,
          purchaseDate: true,
          expiryDate: true,
        },
      }),
      prisma.asset.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          monthlyCost: true,
          purchaseDate: true,
          expiryDate: true,
          createdAt: true,
        },
      }),
    ]);

    const data = aggregateDashboard(
      licenses as LicenseRow[],
      assets as AssetRow[],
      typeParam ?? null
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "대시보드 데이터를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
