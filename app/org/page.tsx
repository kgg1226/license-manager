"use client";

import { useState, useEffect } from "react";
import OrgTree from "./org-tree";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

export default function OrgPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/org/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleRefresh = async () => {
    await fetchCompanies();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-center text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">조직도</h1>
        </div>
        {companies.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">등록된 조직이 없습니다.</p>
          </div>
        ) : (
          <OrgTree companies={companies} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  );
}
