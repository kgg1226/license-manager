"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export default function EmployeeSearch({
  currentQuery,
  currentStatus,
  currentUnassigned,
}: {
  currentQuery: string;
  currentStatus: "ACTIVE" | "OFFBOARDING" | null;
  currentUnassigned: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(currentQuery);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (currentStatus) params.set("status", currentStatus);
    if (currentUnassigned) params.set("unassigned", "true");

    router.push(`/employees?${params.toString()}`);
  };

  const handleStatusChange = (status: "ACTIVE" | "OFFBOARDING" | null) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (currentUnassigned) params.set("unassigned", "true");

    router.push(`/employees?${params.toString()}`);
  };

  const handleUnassignedChange = (checked: boolean) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (currentStatus) params.set("status", currentStatus);
    if (checked) params.set("unassigned", "true");

    router.push(`/employees?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    router.push("/employees");
  };

  return (
    <div className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      {/* 검색 입력 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="이름 또는 부서로 검색..."
            className="w-full border border-gray-300 rounded-lg bg-white pl-10 pr-8 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          검색
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3">
        {/* 상태 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">상태:</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleStatusChange(currentStatus === "ACTIVE" ? null : "ACTIVE")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentStatus === "ACTIVE"
                  ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              활성
            </button>
            <button
              onClick={() => handleStatusChange(currentStatus === "OFFBOARDING" ? null : "OFFBOARDING")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentStatus === "OFFBOARDING"
                  ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              퇴사 예정
            </button>
          </div>
        </div>

        {/* 할당 상태 필터 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <input
              type="checkbox"
              checked={currentUnassigned}
              onChange={(e) => handleUnassignedChange(e.target.checked)}
              className="rounded border-gray-300"
            />
            라이선스 미할당만 보기
          </label>
        </div>

        {/* 필터 초기화 */}
        {(currentQuery || currentStatus || currentUnassigned) && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 활성 필터 표시 */}
      {(currentQuery || currentStatus || currentUnassigned) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
          {currentQuery && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
              검색: "{currentQuery}"
              <button
                onClick={() => setQuery("")}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {currentStatus && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
              {currentStatus === "ACTIVE" ? "활성" : "퇴사 예정"}
              <button
                onClick={() => handleStatusChange(null)}
                className="hover:text-green-900"
              >
                ×
              </button>
            </span>
          )}
          {currentUnassigned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
              라이선스 미할당
              <button
                onClick={() => handleUnassignedChange(false)}
                className="hover:text-purple-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
