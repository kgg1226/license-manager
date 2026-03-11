"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface HardwareDetail {
  assetTag?: string | null; deviceType?: string | null; manufacturer?: string | null;
  model?: string | null; serialNumber?: string | null; hostname?: string | null;
  macAddress?: string | null; ipAddress?: string | null; os?: string | null;
  osVersion?: string | null; location?: string | null; usefulLifeYears: number;
}

interface Asset {
  id: number; name: string; status: AssetStatus; description?: string | null;
  vendor?: string | null; cost?: number | null; monthlyCost?: number | null;
  currency: string; billingCycle?: string | null; expiryDate?: string | null;
  purchaseDate?: string | null; assignee?: { id: number; name: string } | null;
  orgUnit?: { id: number; name: string } | null; company?: { id: number; name: string } | null;
  hardwareDetail?: HardwareDetail | null; createdAt: string; updatedAt: string;
}

const STATUS_LABELS: Record<AssetStatus, string> = { IN_STOCK: "재고", IN_USE: "사용 중", INACTIVE: "미사용", UNUSABLE: "불용", PENDING_DISPOSAL: "폐기 대상", DISPOSED: "폐기 완료" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-blue-100 text-blue-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-gray-100 text-gray-800", UNUSABLE: "bg-yellow-100 text-yellow-800", PENDING_DISPOSAL: "bg-orange-100 text-orange-800", DISPOSED: "bg-red-100 text-red-800" };

export default function HardwareDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user } = useAuth();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<AssetStatus>("IN_USE");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error("자산을 찾을 수 없습니다"); router.push("/hardware"); return; }
        const data = await res.json();
        setAsset(data); setNewStatus(data.status);
      } catch { toast.error("로드 실패"); router.push("/hardware"); }
      finally { setIsLoading(false); }
    })();
  }, [assetId, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "삭제 실패"); return; }
      toast.success("삭제되었습니다"); router.push("/hardware");
    } catch { toast.error("삭제 실패"); }
    finally { setIsDeleting(false); setShowDeleteModal(false); }
  };

  const handleStatusChange = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "상태 변경 실패"); return; }
      setAsset((p) => (p ? { ...p, status: newStatus } : null));
      toast.success("상태가 변경되었습니다"); setShowStatusModal(false);
    } catch { toast.error("상태 변경 실패"); }
    finally { setIsUpdatingStatus(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-gray-600">로딩 중...</p></div></div>;
  if (!asset) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-red-600">자산을 찾을 수 없습니다</p><div className="mt-4 text-center"><Link href="/hardware" className="text-blue-600 hover:underline">목록으로</Link></div></div></div>;

  const fmtCost = (v: number | null | undefined) => v != null ? (asset.currency === "KRW" ? `${v.toLocaleString("ko-KR")}원` : `${asset.currency} ${v.toLocaleString()}`) : "—";
  const hd = asset.hardwareDetail;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/hardware" className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
            <p className="mt-1 text-sm text-gray-500">하드웨어 \• 등록일: {new Date(asset.createdAt).toLocaleDateString("ko-KR")}</p>
          </div>
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>{STATUS_LABELS[asset.status]}</span>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">비용</p><p className="mt-2 text-2xl font-bold">{fmtCost(asset.cost)}</p></div>
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">장비 유형</p><p className="mt-2 text-2xl font-bold text-gray-900">{hd?.deviceType || "—"}</p></div>
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">제조사 / 모델</p><p className="mt-2 text-lg font-bold text-gray-900">{[hd?.manufacturer, hd?.model].filter(Boolean).join(" ") || "—"}</p></div>
        </div>

        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">상세 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><p className="text-sm text-gray-600">자산명</p><p className="mt-1 text-gray-900">{asset.name}</p></div>
              <div><p className="text-sm text-gray-600">공급업체</p><p className="mt-1 text-gray-900">{asset.vendor || "—"}</p></div>
            </div>
            {asset.description && <div><p className="text-sm text-gray-600">설명</p><p className="mt-1 text-gray-900">{asset.description}</p></div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><p className="text-sm text-gray-600">비용</p><p className="mt-1 text-gray-900">{fmtCost(asset.cost)}</p></div>
              <div><p className="text-sm text-gray-600">구매일</p><p className="mt-1 text-gray-900">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("ko-KR") : "—"}</p></div>
            </div>
            {asset.assignee && <div><p className="text-sm text-gray-600">담당자</p><p className="mt-1"><Link href={`/employees/${asset.assignee.id}`} className="text-blue-600 hover:underline">{asset.assignee.name}</Link></p></div>}
            <div className="border-t border-gray-200 pt-4"><p className="text-xs text-gray-500">생성: {new Date(asset.createdAt).toLocaleString("ko-KR")} \• 수정: {new Date(asset.updatedAt).toLocaleString("ko-KR")}</p></div>
          </div>
        </div>

        {hd && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">장비 정보</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hd.assetTag && <div><p className="text-sm text-gray-600">내부 자산 ID</p><p className="mt-1 font-mono text-gray-900">{hd.assetTag}</p></div>}
              {hd.deviceType && <div><p className="text-sm text-gray-600">장비 유형</p><p className="mt-1 text-gray-900">{hd.deviceType}</p></div>}
              {hd.manufacturer && <div><p className="text-sm text-gray-600">제조사</p><p className="mt-1 text-gray-900">{hd.manufacturer}</p></div>}
              {hd.model && <div><p className="text-sm text-gray-600">모델명</p><p className="mt-1 text-gray-900">{hd.model}</p></div>}
              {hd.serialNumber && <div><p className="text-sm text-gray-600">시리얼 넘버</p><p className="mt-1 font-mono text-gray-900">{hd.serialNumber}</p></div>}
              {hd.hostname && <div><p className="text-sm text-gray-600">Hostname</p><p className="mt-1 font-mono text-gray-900">{hd.hostname}</p></div>}
              {hd.macAddress && <div><p className="text-sm text-gray-600">MAC Address</p><p className="mt-1 font-mono text-gray-900">{hd.macAddress}</p></div>}
              {hd.ipAddress && <div><p className="text-sm text-gray-600">IP Address</p><p className="mt-1 font-mono text-gray-900">{hd.ipAddress}</p></div>}
              {hd.os && <div><p className="text-sm text-gray-600">OS</p><p className="mt-1 text-gray-900">{hd.os}{hd.osVersion && ` ${hd.osVersion}`}</p></div>}
              {hd.location && <div><p className="text-sm text-gray-600">보관 위치</p><p className="mt-1 text-gray-900">{hd.location}</p></div>}
            </div>
          </div>
        )}

        {/* 감가상각 */}
        {asset.cost != null && asset.cost > 0 && asset.purchaseDate && (() => {
          const purchaseCost = Number(asset.cost);
          const usefulLife = hd?.usefulLifeYears ?? 5;
          const annualDep = purchaseCost / usefulLife;
          const elapsedMonths = Math.max(0, (Date.now() - new Date(asset.purchaseDate!).getTime()) / (1000 * 60 * 60 * 24 * 30));
          const accumulated = Math.min(purchaseCost, annualDep * (elapsedMonths / 12));
          const residual = Math.max(0, purchaseCost - accumulated);
          const pct = Math.min(100, (accumulated / purchaseCost) * 100);
          return (
            <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">감가상각 (정액법)</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><p className="text-sm text-gray-600">구매금액</p><p className="mt-1 text-lg font-semibold text-gray-900">{purchaseCost.toLocaleString("ko-KR")}원</p></div>
                <div><p className="text-sm text-gray-600">내용연수</p><p className="mt-1 text-lg font-semibold text-gray-900">{usefulLife}년</p></div>
                <div><p className="text-sm text-gray-600">누적 감가상각</p><p className="mt-1 text-lg font-semibold text-red-600">-{Math.round(accumulated).toLocaleString("ko-KR")}원</p></div>
                <div><p className="text-sm text-gray-600">잔존가치</p><p className="mt-1 text-lg font-semibold text-blue-600">{Math.round(residual).toLocaleString("ko-KR")}원</p></div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>경과: {Math.floor(elapsedMonths / 12)}년 {Math.round(elapsedMonths % 12)}개월</span>
                  <span>{pct.toFixed(1)}% 상각</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-red-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })()}

        {user && (
          <div className="flex gap-3">
            <Link href={`/hardware/${asset.id}/edit`} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Edit className="h-4 w-4" />수정</Link>
            <button onClick={() => setShowStatusModal(true)} className="flex-1 rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">상태 변경</button>
            <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />삭제</button>
          </div>
        )}

        {showStatusModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold">상태 변경</h2>
              <div className="mb-6 space-y-2">{(Object.keys(STATUS_LABELS) as AssetStatus[]).map((s) => (<label key={s} className="flex items-center gap-2"><input type="radio" name="status" value={s} checked={newStatus === s} onChange={(e) => setNewStatus(e.target.value as AssetStatus)} className="h-4 w-4" /><span className="text-sm text-gray-700">{STATUS_LABELS[s]}</span></label>))}</div>
              <div className="flex gap-3">
                <button onClick={handleStatusChange} disabled={isUpdatingStatus || newStatus === asset.status} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">변경</button>
                <button onClick={() => setShowStatusModal(false)} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" /><h2 className="text-lg font-bold">삭제 확인</h2></div>
              <p className="mb-6 text-sm text-gray-600">&quot;{asset.name}&quot;을(를) 삭제하시겠습니까?</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={isDeleting} className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{isDeleting ? "삭제 중..." : "삭제"}</button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
