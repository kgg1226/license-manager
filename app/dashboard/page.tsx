import { prisma } from "@/lib/prisma";
import DashboardCharts from "./_components/dashboard-charts";

export const dynamic = "force-dynamic";

function monthKey(year: number, month: number): string {
  return `${year}.${String(month + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const now = new Date();

  const licenses = await prisma.license.findMany({
    select: {
      licenseType: true,
      totalAmountKRW: true,
      paymentCycle: true,
      purchaseDate: true,
      expiryDate: true,
    },
  });

  // ── Metric cards ───────────────────────────────────────────────────────────

  const totalLicenses = licenses.length;

  // Sum annual cost for each license that has cost data
  const totalAnnualKRW = licenses.reduce((sum, l) => {
    if (!l.totalAmountKRW || !l.paymentCycle) return sum;
    const annual =
      l.paymentCycle === "YEARLY" ? l.totalAmountKRW : l.totalAmountKRW * 12;
    return sum + annual;
  }, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const cutoff30 = new Date(now.getTime() + 30 * msPerDay);
  const cutoff90 = new Date(now.getTime() + 90 * msPerDay);

  const expiring30 = licenses.filter(
    (l) => l.expiryDate && l.expiryDate >= now && l.expiryDate <= cutoff30
  ).length;

  const expiring90 = licenses.filter(
    (l) => l.expiryDate && l.expiryDate >= now && l.expiryDate <= cutoff90
  ).length;

  // ── Monthly cost trend — past 12 months ────────────────────────────────────
  // For each month: sum monthlyKRW of all licenses active during that month.
  // A license is "active" in month M if: purchaseDate ≤ monthEnd AND (no expiryDate OR expiryDate ≥ monthStart).
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const offset = 11 - i; // 0 = 11 months ago, 11 = current month
    const y = now.getFullYear();
    const m = now.getMonth() - offset;
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const cost = licenses.reduce((sum, l) => {
      if (!l.totalAmountKRW || !l.paymentCycle) return sum;
      const active =
        l.purchaseDate <= monthEnd &&
        (!l.expiryDate || l.expiryDate >= monthStart);
      if (!active) return sum;
      const monthly =
        l.paymentCycle === "MONTHLY"
          ? l.totalAmountKRW
          : Math.floor(l.totalAmountKRW / 12);
      return sum + monthly;
    }, 0);

    return { month: monthKey(monthStart.getFullYear(), monthStart.getMonth()), cost };
  });

  // ── License type distribution ──────────────────────────────────────────────
  const typeCount = { KEY_BASED: 0, VOLUME: 0, NO_KEY: 0 } as Record<string, number>;
  for (const l of licenses) typeCount[l.licenseType]++;

  const typeDistribution = [
    { name: "개별 키", value: typeCount.KEY_BASED },
    { name: "볼륨 키", value: typeCount.VOLUME },
    { name: "키 없음", value: typeCount.NO_KEY },
  ].filter((d) => d.value > 0);

  // ── License growth — cumulative count by purchase month ────────────────────
  const growthTrend = Array.from({ length: 12 }, (_, i) => {
    const offset = 11 - i;
    const y = now.getFullYear();
    const m = now.getMonth() - offset;
    const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const monthStart = new Date(y, m, 1);
    const count = licenses.filter((l) => l.purchaseDate <= monthEnd).length;
    return { month: monthKey(monthStart.getFullYear(), monthStart.getMonth()), count };
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="mb-8 text-sm text-gray-500">라이선스 현황 및 비용 요약</p>

        {/* ── Metric cards ── */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="전체 라이선스"
            value={totalLicenses.toLocaleString("ko-KR")}
            unit="개"
            description="등록된 전체 라이선스 수"
            accent="blue"
          />
          <MetricCard
            title="총 연간 비용"
            value={"₩" + Math.round(totalAnnualKRW).toLocaleString("ko-KR")}
            unit=""
            description="비용 입력 라이선스의 연간 합산"
            accent="green"
          />
          <MetricCard
            title="30일 내 만료"
            value={expiring30.toLocaleString("ko-KR")}
            unit="개"
            description="즉각적인 갱신·해지 검토 필요"
            accent={expiring30 > 0 ? "red" : "gray"}
          />
          <MetricCard
            title="90일 내 만료"
            value={expiring90.toLocaleString("ko-KR")}
            unit="개"
            description="사전 계획이 필요한 라이선스"
            accent={expiring90 > 0 ? "yellow" : "gray"}
          />
        </div>

        {/* ── Charts ── */}
        <DashboardCharts
          monthlyTrend={monthlyTrend}
          typeDistribution={typeDistribution}
          growthTrend={growthTrend}
        />
      </div>
    </div>
  );
}

// ── MetricCard ─────────────────────────────────────────────────────────────

const accentStyles = {
  blue: {
    border: "border-blue-500",
    badge: "bg-blue-50 text-blue-700",
    icon: "text-blue-500",
  },
  green: {
    border: "border-green-500",
    badge: "bg-green-50 text-green-700",
    icon: "text-green-500",
  },
  red: {
    border: "border-red-500",
    badge: "bg-red-50 text-red-700",
    icon: "text-red-500",
  },
  yellow: {
    border: "border-yellow-400",
    badge: "bg-yellow-50 text-yellow-700",
    icon: "text-yellow-500",
  },
  gray: {
    border: "border-gray-300",
    badge: "bg-gray-50 text-gray-600",
    icon: "text-gray-400",
  },
} as const;

type Accent = keyof typeof accentStyles;

function MetricCard({
  title,
  value,
  unit,
  description,
  accent,
}: {
  title: string;
  value: string;
  unit: string;
  description: string;
  accent: Accent;
}) {
  const s = accentStyles[accent];
  return (
    <div
      className={`rounded-lg border-l-4 bg-white px-5 py-5 shadow-sm ring-1 ring-gray-200 ${s.border}`}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${s.icon}`}>
        {value}
        {unit && (
          <span className="ml-1 text-base font-medium">{unit}</span>
        )}
      </p>
      <p className="mt-2 text-xs text-gray-400">{description}</p>
    </div>
  );
}
