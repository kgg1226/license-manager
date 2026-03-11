"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import type {
  TrendPoint,
  TypeDistPoint,
  StatusDistPoint,
  GrowthPoint,
} from "@/lib/dashboard-aggregator";

// ── 색상 ──

const TYPE_COLORS: Record<string, string> = {
  SOFTWARE: "#3b82f6",
  CLOUD: "#8b5cf6",
  HARDWARE: "#f59e0b",
  DOMAIN_SSL: "#10b981",
  OTHER: "#6b7280",
};

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "#3b82f6",
  IN_USE: "#10b981",
  INACTIVE: "#6b7280",
  UNUSABLE: "#f59e0b",
  PENDING_DISPOSAL: "#f97316",
  DISPOSED: "#ef4444",
};

// ── 유틸 ──

function formatCostAxis(value: number): string {
  if (value === 0) return "0";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return value.toLocaleString("ko-KR");
}

function CostTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white p-3 shadow-lg ring-1 ring-gray-200 text-sm">
      <p className="mb-1 font-medium text-gray-700">{label}</p>
      <p className="text-blue-600 font-semibold">
        ₩{payload[0].value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white p-3 shadow-lg ring-1 ring-gray-200 text-sm">
      <p className="mb-1 font-medium text-gray-700">{label}</p>
      <p className="text-indigo-600 font-semibold">{payload[0].value}개</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-md bg-gray-50">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ── 메인 컴포넌트 ──

export default function DashboardCharts({
  monthlyTrend,
  typeDistribution,
  statusDistribution,
  growthTrend,
}: {
  monthlyTrend: TrendPoint[];
  typeDistribution: TypeDistPoint[];
  statusDistribution: StatusDistPoint[];
  growthTrend: GrowthPoint[];
}) {
  const hasMonthlyData = monthlyTrend.some((d) => d.cost > 0);
  const hasTypeData = typeDistribution.length > 0;
  const hasStatusData = statusDistribution.length > 0;
  const hasGrowthData = growthTrend.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Row 1: 월별 비용 추이 */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-1 text-base font-semibold text-gray-900">월별 비용 추이 (최근 12개월)</h2>
        <p className="mb-4 text-xs text-gray-500">활성 자산의 월 환산 비용 합계</p>
        {hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCostAxis} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<CostTooltip />} cursor={{ fill: "#eff6ff" }} />
              <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="비용 정보가 입력된 자산이 없습니다." />
        )}
      </div>

      {/* Row 2: 카테고리 분포 + 상태 분포 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 카테고리별 분포 */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-base font-semibold text-gray-900">자산 유형 분포</h2>
          <p className="mb-4 text-xs text-gray-500">유형별 수량 및 월 비용</p>
          {hasTypeData ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                  paddingAngle={3}
                  label={({ label, percent }: { label: string; percent: number }) => `${label} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {typeDistribution.map((d) => (
                    <Cell key={d.name} fill={TYPE_COLORS[d.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Legend formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>} />
                <Tooltip
                  formatter={(value: number, _name: string, props: { payload?: TypeDistPoint }) => {
                    const cost = props.payload?.cost ?? 0;
                    return [`${value}개 · 월 ₩${cost.toLocaleString("ko-KR")}`, ""];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="등록된 자산이 없습니다." />
          )}
        </div>

        {/* 상태별 분포 */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-base font-semibold text-gray-900">자산 상태 분포</h2>
          <p className="mb-4 text-xs text-gray-500">사용 상태별 수량</p>
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                  paddingAngle={3}
                  label={({ label, percent }: { label: string; percent: number }) => `${label} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDistribution.map((d) => (
                    <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Legend formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>} />
                <Tooltip formatter={(value: number) => [`${value}개`, "자산 수"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="등록된 자산이 없습니다." />
          )}
        </div>
      </div>

      {/* Row 3: 자산 증가 추이 */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-1 text-base font-semibold text-gray-900">자산 증가 추이</h2>
        <p className="mb-4 text-xs text-gray-500">등록일 기준 누적 자산 수 (최근 12개월)</p>
        {hasGrowthData ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growthTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<GrowthTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#growthGradient)"
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="등록된 자산이 없습니다." />
        )}
      </div>
    </div>
  );
}
