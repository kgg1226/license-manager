import { prisma } from "@/lib/prisma";
import {
  aggregateDashboard,
  type LicenseRow,
  type AssetRow,
} from "@/lib/dashboard-aggregator";
import DashboardContent from "./_components/dashboard-content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 서버 사이드에서 초기 데이터 fetch (전체 통합 뷰)
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

  const initialData = aggregateDashboard(
    licenses as LicenseRow[],
    assets as AssetRow[],
    null
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <DashboardContent initialData={initialData} />
      </div>
    </div>
  );
}
