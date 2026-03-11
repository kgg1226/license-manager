"use client";

import { useState, useEffect, useCallback } from "react";
import CategoryTabs from "./category-tabs";
import DashboardMetricCards from "./metric-cards";
import DashboardCharts from "./dashboard-charts";
import type { DashboardData, AssetCategory } from "@/lib/dashboard-aggregator";
import { CATEGORY_LABELS } from "@/lib/dashboard-aggregator";

export default function DashboardContent({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedType, setSelectedType] = useState<AssetCategory | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (type: AssetCategory | null) => {
    setLoading(true);
    try {
      const url = type ? `/api/dashboard?type=${type}` : "/api/dashboard";
      const res = await fetch(url);
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabChange = useCallback(
    (type: AssetCategory | null) => {
      setSelectedType(type);
      if (type === null) {
        // 전체 탭은 초기 데이터 사용 (서버에서 받은 것)
        setData(initialData);
      } else {
        fetchData(type);
      }
    },
    [initialData, fetchData]
  );

  // initialData가 변경되면 (페이지 새로고침) 동기화
  useEffect(() => {
    if (selectedType === null) {
      setData(initialData);
    }
  }, [initialData, selectedType]);

  const title = selectedType
    ? `${CATEGORY_LABELS[selectedType]} 자산 현황`
    : "통합 자산 현황";

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {selectedType
          ? `${CATEGORY_LABELS[selectedType]} 카테고리의 자산 현황 및 비용 요약`
          : "라이선스 포함 전체 IT 자산 현황 및 비용 요약"}
      </p>

      <CategoryTabs selected={selectedType} onChange={handleTabChange} />
      <DashboardMetricCards metrics={data.metrics} />
      <DashboardCharts
        monthlyTrend={data.charts.monthlyTrend}
        typeDistribution={data.charts.typeDistribution}
        statusDistribution={data.charts.statusDistribution}
        growthTrend={data.charts.growthTrend}
      />
    </div>
  );
}
