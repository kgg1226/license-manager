"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Edit, Trash2, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface Asset {
  id: number; name: string; status: AssetStatus; cost?: number | null; currency: string;
  purchaseDate?: string | null; expiryDate?: string | null;
  assignee?: { id: number; name: string } | null;
  hardwareDetail?: { deviceType?: string | null; manufacturer?: string | null; model?: string | null } | null;
}

const STATUS_LABELS: Record<AssetStatus, string> = { IN_STOCK: "재고", IN_USE: "사용 중", INACTIVE: "미사용", UNUSABLE: "불용", PENDING_DISPOSAL: "폐기 대상", DISPOSED: "폐기 완료" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-gray-100 text-gray-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-yellow-100 text-yellow-800", UNUSABLE: "bg-orange-100 text-orange-800", PENDING_DISPOSAL: "bg-red-100 text-red-800", DISPOSED: "bg-gray-800 text-gray-100" };

type SortField = "name" | "deviceType" | "manufacturer" | "status" | "cost" | "assignee" | "purchaseDate";
type SortOrder = "asc" | "desc";

function formatCost(cost: number | null | undefined, currency: string): string {
  if (cost == null) return "—";
  return currency === "KRW" ? `${cost.toLocaleString("ko-KR")}원` : `${currency} ${cost.toLocaleString()}`;
}

const STATUS_ORDER: Record<AssetStatus, number> = { IN_STOCK: 0, IN_USE: 1, INACTIVE: 2, UNUSABLE: 3, PENDING_DISPOSAL: 4, DISPOSED: 5 };

function sortAssets(assets: Asset[], field: SortField | null, order: SortOrder): Asset[] {
  if (!field) return assets;
  return [...assets].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name": cmp = a.name.localeCompare(b.name, "ko"); break;
      case "deviceType": {
        const av = a.hardwareDetail?.deviceType ?? "";
        const bv = b.hardwareDetail?.deviceType ?? "";
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "manufacturer": {
        const av = [a.hardwareDetail?.manufacturer, a.hardwareDetail?.model].filter(Boolean).join(" ");
        const bv = [b.hardwareDetail?.manufacturer, b.hardwareDetail?.model].filter(Boolean).join(" ");
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "status": cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case "cost": {
        const av = a.cost ?? -Infinity;
        const bv = b.cost ?? -Infinity;
        cmp = av - bv;
        break;
      }
      case "assignee": {
        const av = a.assignee?.name ?? "\uffff";
        const bv = b.assignee?.name ?? "\uffff";
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "purchaseDate": {
        const av = a.purchaseDate ?? "";
        const bv = b.purchaseDate ?? "";
        cmp = av.localeCompare(bv);
        break;
      }
    }
    return order === "desc" ? -cmp : cmp;
  });
}

export default function HardwareListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | "">("");

  // Sorting state from URL
  const [sortField, setSortField] = useState<SortField | null>((searchParams.get("sort") as SortField) || null);
  const [sortOrder, setSortOrder] = useState<SortOrder>((searchParams.get("order") as SortOrder) || "asc");

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "HARDWARE");
      if (searchQuery) params.set("search", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("limit", "1000");
      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets(data.assets ?? []); setTotal(data.total ?? 0);
    } catch { toast.error("하드웨어 목록을 불러올 수 없습니다"); }
    finally { setIsLoading(false); }
  }, [searchQuery, selectedStatus]);

  useEffect(() => { const t = setTimeout(() => loadAssets(), 300); return () => clearTimeout(t); }, [loadAssets]);

  // Update URL when sort changes
  const handleSort = (field: SortField) => {
    let newField: SortField | null = field;
    let newOrder: SortOrder = "asc";
    if (sortField === field) {
      if (sortOrder === "asc") { newOrder = "desc"; }
      else { newField = null; newOrder = "asc"; }
    }
    setSortField(newField);
    setSortOrder(newOrder);
    const url = new URL(window.location.href);
    if (newField) {
      url.searchParams.set("sort", newField);
      url.searchParams.set("order", newOrder);
    } else {
      url.searchParams.delete("sort");
      url.searchParams.delete("order");
    }
    window.history.replaceState(null, "", url.toString());
  };

  const sortedAssets = useMemo(() => sortAssets(assets, sortField, sortOrder), [assets, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">⇅</span>;
    return sortOrder === "asc" ? <ChevronUp className="ml-0.5 inline h-3 w-3 text-blue-600" /> : <ChevronDown className="ml-0.5 inline h-3 w-3 text-blue-600" />;
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "삭제 실패"); return; }
      toast.success("삭제되었습니다"); await loadAssets();
    } catch { toast.error("삭제 실패"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">하드웨어 관리</h1>
          <div className="flex gap-2">
            <button onClick={loadAssets} disabled={isLoading} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <Link href="/hardware/new" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />새 하드웨어 등록
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4">
            <input type="text" placeholder="하드웨어 자산명 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedStatus("")} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === "" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>모든 상태</button>
            {(Object.keys(STATUS_LABELS) as AssetStatus[]).map((s) => (
              <button key={s} onClick={() => setSelectedStatus(s)} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{STATUS_LABELS[s]}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600" onClick={() => handleSort("name")}>자산명<SortIcon field="name" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600" onClick={() => handleSort("deviceType")}>장비 유형<SortIcon field="deviceType" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600" onClick={() => handleSort("manufacturer")}>제조사 / 모델<SortIcon field="manufacturer" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600" onClick={() => handleSort("status")}>상태<SortIcon field="status" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600" onClick={() => handleSort("cost")}>비용<SortIcon field="cost" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600" onClick={() => handleSort("assignee")}>할당자<SortIcon field="assignee" /></th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold">작업</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">로딩 중...</td></tr>
              ) : sortedAssets.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">하드웨어 자산을 찾을 수 없습니다</td></tr>
              ) : (
                sortedAssets.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium"><Link href={`/hardware/${a.id}`} className="text-blue-600 hover:underline">{a.name}</Link></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.hardwareDetail?.deviceType || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{[a.hardwareDetail?.manufacturer, a.hardwareDetail?.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-6 py-4"><span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span></td>
                    <td className="px-6 py-4 text-sm">{formatCost(a.cost, a.currency)}</td>
                    <td className="px-6 py-4 text-sm">{a.assignee ? <Link href={`/employees/${a.assignee.id}`} className="text-blue-600 hover:underline">{a.assignee.name}</Link> : <span className="text-gray-400">미할당</span>}</td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => router.push(`/hardware/${a.id}`)} className="rounded p-1 hover:bg-gray-200" title="상세"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => router.push(`/hardware/${a.id}/edit`)} className="rounded p-1 hover:bg-gray-200" title="수정"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(a.id, a.name)} className="rounded p-1 hover:bg-gray-200" title="삭제"><Trash2 className="h-4 w-4 text-red-600" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">총 {total}개 하드웨어 자산</div>
      </div>
    </div>
  );
}
