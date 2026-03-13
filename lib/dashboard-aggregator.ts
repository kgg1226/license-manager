/**
 * 통합 자산 대시보드 집계 라이브러리
 *
 * License와 Asset 데이터를 통합 타입(UnifiedItem)으로 정규화한 뒤
 * 메트릭 카드, 차트 데이터를 계산한다.
 */

// ── 타입 정의 ──

export type AssetCategory = "SOFTWARE" | "CLOUD" | "HARDWARE" | "DOMAIN_SSL" | "CONTRACT" | "OTHER";
export type UnifiedStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

/** 비용 계산에 포함되는 상태 */
const COST_ACTIVE_STATUSES: Set<UnifiedStatus> = new Set(["IN_STOCK", "IN_USE"]);

export interface UnifiedItem {
  source: "LICENSE" | "ASSET";
  sourceId: number;
  name: string;
  category: AssetCategory;
  status: UnifiedStatus;
  monthlyCostKRW: number;
  purchaseDate: Date | null;
  expiryDate: Date | null;
}

export interface DashboardMetrics {
  totalAssets: number;
  totalMonthlyCostKRW: number;
  totalAnnualCostKRW: number;
  expiring30: number;
  expiring90: number;
  activeCount: number;     // IN_STOCK + IN_USE
  inactiveCount: number;   // INACTIVE + UNUSABLE + PENDING_DISPOSAL
  disposedCount: number;   // DISPOSED
}

export interface TrendPoint {
  month: string;
  cost: number;
}

export interface TypeDistPoint {
  name: string;
  label: string;
  count: number;
  cost: number;
}

export interface StatusDistPoint {
  name: string;
  label: string;
  count: number;
}

export interface GrowthPoint {
  month: string;
  count: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  charts: {
    monthlyTrend: TrendPoint[];
    typeDistribution: TypeDistPoint[];
    statusDistribution: StatusDistPoint[];
    growthTrend: GrowthPoint[];
  };
  filter: {
    type: AssetCategory | null;
  };
}

// ── 카테고리 라벨 ──

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  SOFTWARE: "소프트웨어",
  CLOUD: "클라우드",
  HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인·SSL",
  CONTRACT: "계약",
  OTHER: "기타",
};

const STATUS_LABELS: Record<UnifiedStatus, string> = {
  IN_STOCK: "재고",
  IN_USE: "사용 중",
  INACTIVE: "미사용",
  UNUSABLE: "불용",
  PENDING_DISPOSAL: "폐기 대상",
  DISPOSED: "폐기 완료",
};

// ── DB row 타입 (Prisma select 결과) ──

export interface LicenseRow {
  id: number;
  name: string;
  licenseType: string;
  totalAmountKRW: number | null;
  paymentCycle: string | null;
  purchaseDate: Date;
  expiryDate: Date | null;
}

export interface AssetRow {
  id: number;
  name: string;
  type: string;
  status: string;
  monthlyCost: { toNumber(): number } | number | null; // Prisma Decimal
  purchaseDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
}

// ── 정규화 함수 ──

export function normalizeLicenses(licenses: LicenseRow[]): UnifiedItem[] {
  const now = new Date();
  return licenses.map((l) => {
    let monthlyCostKRW = 0;
    if (l.totalAmountKRW && l.paymentCycle) {
      monthlyCostKRW =
        l.paymentCycle === "MONTHLY"
          ? l.totalAmountKRW
          : Math.floor(l.totalAmountKRW / 12);
    }

    // 라이선스 상태: 만료일 지났으면 INACTIVE, 아니면 IN_USE
    let status: UnifiedStatus = "IN_USE";
    if (l.expiryDate && l.expiryDate < now) {
      status = "INACTIVE";
    }

    return {
      source: "LICENSE" as const,
      sourceId: l.id,
      name: l.name,
      category: "SOFTWARE" as AssetCategory,
      status,
      monthlyCostKRW,
      purchaseDate: l.purchaseDate,
      expiryDate: l.expiryDate,
    };
  });
}

export function normalizeAssets(assets: AssetRow[]): UnifiedItem[] {
  return assets.map((a) => {
    let monthlyCostKRW = 0;
    if (a.monthlyCost != null) {
      monthlyCostKRW =
        typeof a.monthlyCost === "number"
          ? a.monthlyCost
          : a.monthlyCost.toNumber();
    }

    return {
      source: "ASSET" as const,
      sourceId: a.id,
      name: a.name,
      category: (a.type as AssetCategory) || "OTHER",
      status: (a.status as UnifiedStatus) || "IN_STOCK",
      monthlyCostKRW,
      purchaseDate: a.purchaseDate ?? a.createdAt,
      expiryDate: a.expiryDate,
    };
  });
}

// ── 집계 함수 ──

function monthKey(year: number, month: number): string {
  return `${year}.${String(month + 1).padStart(2, "0")}`;
}

export function computeMetrics(items: UnifiedItem[]): DashboardMetrics {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const cutoff30 = new Date(now.getTime() + 30 * msPerDay);
  const cutoff90 = new Date(now.getTime() + 90 * msPerDay);

  let totalMonthlyCostKRW = 0;
  let expiring30 = 0;
  let expiring90 = 0;
  let activeCount = 0;
  let inactiveCount = 0;
  let disposedCount = 0;

  for (const item of items) {
    if (COST_ACTIVE_STATUSES.has(item.status)) {
      totalMonthlyCostKRW += item.monthlyCostKRW;
      activeCount++;
    } else if (item.status === "DISPOSED") {
      disposedCount++;
    } else {
      // INACTIVE, UNUSABLE, PENDING_DISPOSAL
      inactiveCount++;
    }

    if (item.expiryDate && item.expiryDate >= now) {
      if (item.expiryDate <= cutoff30) expiring30++;
      if (item.expiryDate <= cutoff90) expiring90++;
    }
  }

  return {
    totalAssets: items.length,
    totalMonthlyCostKRW: Math.round(totalMonthlyCostKRW),
    totalAnnualCostKRW: Math.round(totalMonthlyCostKRW * 12),
    expiring30,
    expiring90,
    activeCount,
    inactiveCount,
    disposedCount,
  };
}

export function computeMonthlyTrend(items: UnifiedItem[], months = 12): TrendPoint[] {
  const now = new Date();
  const excludeStatuses: Set<UnifiedStatus> = new Set(["DISPOSED", "UNUSABLE", "PENDING_DISPOSAL"]);

  return Array.from({ length: months }, (_, i) => {
    const offset = months - 1 - i;
    const y = now.getFullYear();
    const m = now.getMonth() - offset;
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const cost = items.reduce((sum, item) => {
      if (excludeStatuses.has(item.status)) return sum;
      const pDate = item.purchaseDate ?? new Date(0);
      const active =
        pDate <= monthEnd && (!item.expiryDate || item.expiryDate >= monthStart);
      return active ? sum + item.monthlyCostKRW : sum;
    }, 0);

    return {
      month: monthKey(monthStart.getFullYear(), monthStart.getMonth()),
      cost: Math.round(cost),
    };
  });
}

export function computeTypeDistribution(items: UnifiedItem[]): TypeDistPoint[] {
  const map = new Map<AssetCategory, { count: number; cost: number }>();
  for (const item of items) {
    const entry = map.get(item.category) ?? { count: 0, cost: 0 };
    entry.count++;
    if (COST_ACTIVE_STATUSES.has(item.status)) entry.cost += item.monthlyCostKRW;
    map.set(item.category, entry);
  }

  const order: AssetCategory[] = ["SOFTWARE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "CONTRACT", "OTHER"];
  return order
    .filter((cat) => map.has(cat))
    .map((cat) => ({
      name: cat,
      label: CATEGORY_LABELS[cat],
      count: map.get(cat)!.count,
      cost: Math.round(map.get(cat)!.cost),
    }));
}

export function computeStatusDistribution(items: UnifiedItem[]): StatusDistPoint[] {
  const map = new Map<UnifiedStatus, number>();
  for (const item of items) {
    map.set(item.status, (map.get(item.status) ?? 0) + 1);
  }

  const order: UnifiedStatus[] = ["IN_STOCK", "IN_USE", "INACTIVE", "UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"];
  return order
    .filter((s) => map.has(s))
    .map((s) => ({
      name: s,
      label: STATUS_LABELS[s],
      count: map.get(s)!,
    }));
}

export function computeGrowthTrend(items: UnifiedItem[], months = 12): GrowthPoint[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const offset = months - 1 - i;
    const y = now.getFullYear();
    const m = now.getMonth() - offset;
    const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const count = items.filter((item) => {
      const pDate = item.purchaseDate ?? new Date(0);
      return pDate <= monthEnd;
    }).length;
    return {
      month: monthKey(monthEnd.getFullYear(), monthEnd.getMonth()),
      count,
    };
  });
}

// ── 메인 집계 함수 ──

export function aggregateDashboard(
  licenses: LicenseRow[],
  assets: AssetRow[],
  filterType?: AssetCategory | null
): DashboardData {
  let items = [
    ...normalizeLicenses(licenses),
    ...normalizeAssets(assets),
  ];

  if (filterType) {
    items = items.filter((item) => item.category === filterType);
  }

  return {
    metrics: computeMetrics(items),
    charts: {
      monthlyTrend: computeMonthlyTrend(items),
      typeDistribution: computeTypeDistribution(items),
      statusDistribution: computeStatusDistribution(items),
      growthTrend: computeGrowthTrend(items),
    },
    filter: { type: filterType ?? null },
  };
}
