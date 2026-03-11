"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface Asset {
  id: number;
  name: string;
  status: AssetStatus;
  cost?: number | null;
  currency: string;
  expiryDate?: string | null;
  assignee?: { id: number; name: string } | null;
  cloudDetail?: { platform?: string | null; accountId?: string | null } | null;
}

const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: "재고",
  IN_USE: "사용 중",
  INACTIVE: "미사용",
  UNUSABLE: "불용",
  PENDING_DISPOSAL: "폐기 대상",
  DISPOSED: "폐기 완료",
};

const STATUS_COLORS: Record<AssetStatus, string> = {
  IN_STOCK: "bg-blue-100 text-blue-800",
  IN_USE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  UNUSABLE: "bg-yellow-100 text-yellow-800",
  PENDING_DISPOSAL: "bg-orange-100 text-orange-800",
  DISPOSED: "bg-red-100 text-red-800",
};

function formatCost(cost: number | null | undefined, currency: string): string {
  if (cost == null) return "—";
  if (currency === "KRW") return `${cost.toLocaleString("ko-KR")}원`;
  return `${currency} ${cost.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function CloudListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | "">("");

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "CLOUD");
      if (searchQuery) params.set("search", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("limit", "50");

      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets(data.assets ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("클라우드 자산 목록을 불러올 수 없습니다");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => loadAssets(), 300);
    return () => clearTimeout(timer);
  }, [loadAssets]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "삭제에 실패했습니다");
        return;
      }
      toast.success("삭제되었습니다");
      await loadAssets();
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">클라우드 관리</h1>
          <div className="flex gap-2">
            <button onClick={loadAssets} disabled={isLoading} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {user && (
              <Link href="/cloud/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                새 클라우드 등록
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4">
            <input type="text" placeholder="클라우드 자산명 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedStatus("")} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === "" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
              모든 상태
            </button>
            {(Object.keys(STATUS_LABELS) as AssetStatus[]).map((status) => (
              <button key={status} onClick={() => setSelectedStatus(status)} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === status ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold">자산명</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">플랫폼</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">비용</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">만료일</th>
                <th className="px-6 py-3 text-left text-xs font-semibold">할당자</th>
                <th className="px-6 py-3 text-right text-xs font-semibold">작업</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">로딩 중...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">클라우드 자산을 찾을 수 없습니다</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/cloud/${asset.id}`} className="text-blue-600 hover:underline">{asset.name}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{asset.cloudDetail?.platform || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[asset.status]}`}>{STATUS_LABELS[asset.status]}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{formatCost(asset.cost, asset.currency)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(asset.expiryDate)}</td>
                    <td className="px-6 py-4 text-sm">{asset.assignee?.name || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => router.push(`/cloud/${asset.id}`)} className="rounded p-1 hover:bg-gray-200" title="상세"><Eye className="h-4 w-4" /></button>
                        {user && (
                          <>
                            <button onClick={() => router.push(`/cloud/${asset.id}/edit`)} className="rounded p-1 hover:bg-gray-200" title="수정"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(asset.id, asset.name)} className="rounded p-1 hover:bg-gray-200" title="삭제"><Trash2 className="h-4 w-4 text-red-600" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">총 {total}개 클라우드 자산</div>
      </div>
    </div>
  );
}
