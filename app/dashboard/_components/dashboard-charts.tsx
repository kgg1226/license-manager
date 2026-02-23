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

type MonthlyTrendPoint = { month: string; cost: number };
type TypeDistributionPoint = { name: string; value: number };
type GrowthPoint = { month: string; count: number };

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#6b7280"];

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

export default function DashboardCharts({
  monthlyTrend,
  typeDistribution,
  growthTrend,
}: {
  monthlyTrend: MonthlyTrendPoint[];
  typeDistribution: TypeDistributionPoint[];
  growthTrend: GrowthPoint[];
}) {
  const hasMonthlyData = monthlyTrend.some((d) => d.cost > 0);
  const hasTypeData = typeDistribution.length > 0;
  const hasGrowthData = growthTrend.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Row 1: Monthly cost trend */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          월별 비용 추이 (최근 12개월)
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          비용 정보가 입력된 라이선스의 월 환산 합계
        </p>
        {hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCostAxis}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<CostTooltip />} cursor={{ fill: "#eff6ff" }} />
              <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="비용 정보가 입력된 라이선스가 없습니다." />
        )}
      </div>

      {/* Row 2: Pie chart + Area chart side-by-side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* License type distribution */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            라이선스 유형 분포
          </h2>
          <p className="mb-4 text-xs text-gray-500">전체 등록 라이선스 기준</p>
          {hasTypeData ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {typeDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
                <Tooltip
                  formatter={(value) => [`${value}개`, "라이선스 수"]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="등록된 라이선스가 없습니다." />
          )}
        </div>

        {/* Growth trend */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            라이선스 증가 추이
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            구매일 기준 누적 라이선스 수 (최근 12개월)
          </p>
          {hasGrowthData ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={growthTrend}
                margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              >
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
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
            <EmptyState message="등록된 라이선스가 없습니다." />
          )}
        </div>
      </div>
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
