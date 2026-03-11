import type { DashboardMetrics } from "@/lib/dashboard-aggregator";

// ── 스타일 ──

const accentStyles = {
  blue: { border: "border-blue-500", icon: "text-blue-500" },
  green: { border: "border-green-500", icon: "text-green-500" },
  red: { border: "border-red-500", icon: "text-red-500" },
  yellow: { border: "border-yellow-400", icon: "text-yellow-500" },
  gray: { border: "border-gray-300", icon: "text-gray-400" },
  purple: { border: "border-purple-500", icon: "text-purple-500" },
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
  unit?: string;
  description: string;
  accent: Accent;
}) {
  const s = accentStyles[accent];
  return (
    <div className={`rounded-lg border-l-4 bg-white px-5 py-5 shadow-sm ring-1 ring-gray-200 ${s.border}`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`text-2xl font-bold tabular-nums ${s.icon}`}>
        {value}
        {unit && <span className="ml-1 text-base font-medium">{unit}</span>}
      </p>
      <p className="mt-2 text-xs text-gray-400">{description}</p>
    </div>
  );
}

function formatCost(value: number): string {
  if (value >= 100_000_000) return `₩${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `₩${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
  return `₩${value.toLocaleString("ko-KR")}`;
}

export default function DashboardMetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="전체 자산"
        value={metrics.totalAssets.toLocaleString("ko-KR")}
        unit="개"
        description={`사용 중 ${metrics.activeCount} · 미사용 ${metrics.inactiveCount} · 폐기 ${metrics.disposedCount}`}
        accent="blue"
      />
      <MetricCard
        title="월간 비용"
        value={formatCost(metrics.totalMonthlyCostKRW)}
        description={`연간 환산 ${formatCost(metrics.totalAnnualCostKRW)}`}
        accent="green"
      />
      <MetricCard
        title="30일 내 만료"
        value={metrics.expiring30.toLocaleString("ko-KR")}
        unit="개"
        description="즉각적인 갱신·해지 검토 필요"
        accent={metrics.expiring30 > 0 ? "red" : "gray"}
      />
      <MetricCard
        title="90일 내 만료"
        value={metrics.expiring90.toLocaleString("ko-KR")}
        unit="개"
        description="사전 계획이 필요한 자산"
        accent={metrics.expiring90 > 0 ? "yellow" : "gray"}
      />
    </div>
  );
}
