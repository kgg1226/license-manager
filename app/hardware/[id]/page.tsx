"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, AlertCircle, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface HardwareDetail {
  assetTag?: string | null; deviceType?: string | null; manufacturer?: string | null;
  model?: string | null; serialNumber?: string | null; hostname?: string | null;
  macAddress?: string | null; ipAddress?: string | null; os?: string | null;
  osVersion?: string | null; location?: string | null; usefulLifeYears: number;
  cpu?: string | null; ram?: string | null; storage?: string | null;
  gpu?: string | null; displaySize?: string | null;
}

interface Asset {
  id: number; name: string; status: AssetStatus; description?: string | null;
  vendor?: string | null; cost?: number | null; monthlyCost?: number | null;
  currency: string; billingCycle?: string | null; expiryDate?: string | null;
  purchaseDate?: string | null; assignee?: { id: number; name: string } | null;
  orgUnit?: { id: number; name: string } | null; company?: { id: number; name: string } | null;
  hardwareDetail?: HardwareDetail | null; createdAt: string; updatedAt: string;
}

interface AssignmentHistoryEntry {
  id: number; action: string; reason?: string | null; createdAt: string;
  employee: { id: number; name: string };
  performedBy?: { id: number; username: string } | null;
}

interface Employee {
  id: number; name: string; department?: string | null; email?: string | null;
}

const STATUS_LABELS: Record<AssetStatus, string> = { IN_STOCK: "재고", IN_USE: "사용 중", INACTIVE: "미사용", UNUSABLE: "불용", PENDING_DISPOSAL: "폐기 대상", DISPOSED: "폐기 완료" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-gray-100 text-gray-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-yellow-100 text-yellow-800", UNUSABLE: "bg-orange-100 text-orange-800", PENDING_DISPOSAL: "bg-red-100 text-red-800", DISPOSED: "bg-gray-800 text-gray-100" };

// IP/MAC은 Server, Network만 표시
const SHOW_NETWORK_FIELDS = new Set(["Server", "Network"]);
// PC사양 필드(cpu/ram/storage)는 Laptop, Desktop, Server, Network에서 표시
const SHOW_SPEC_FIELDS = new Set(["Laptop", "Desktop", "Server", "Network"]);
// GPU는 Laptop, Desktop만
const SHOW_GPU = new Set(["Laptop", "Desktop"]);
// displaySize는 Laptop만
const SHOW_DISPLAY = new Set(["Laptop"]);

export default function HardwareDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status change modals
  const [showUnusableModal, setShowUnusableModal] = useState(false);
  const [showDisposedModal, setShowDisposedModal] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Assign/Unassign
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [assignReason, setAssignReason] = useState("");
  const [unassignReason, setUnassignReason] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "">("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Assignment history
  const [assignHistory, setAssignHistory] = useState<AssignmentHistoryEntry[]>([]);

  const loadAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      if (!res.ok) { toast.error("자산을 찾을 수 없습니다"); router.push("/hardware"); return; }
      const data = await res.json();
      setAsset(data);
    } catch { toast.error("로드 실패"); router.push("/hardware"); }
    finally { setIsLoading(false); }
  }, [assetId, router]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}/assignment-history`);
      if (res.ok) { const data = await res.json(); setAssignHistory(data); }
    } catch { /* ignore */ }
  }, [assetId]);

  useEffect(() => { loadAsset(); loadHistory(); }, [loadAsset, loadHistory]);

  // Load employees for assign modal
  const loadEmployees = async (search: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/employees?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : data.employees ?? []);
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "삭제 실패"); return; }
      toast.success("삭제되었습니다"); router.push("/hardware");
    } catch { toast.error("삭제 실패"); }
    finally { setIsDeleting(false); setShowDeleteModal(false); }
  };

  // 불용 처리 → UNUSABLE → auto PENDING_DISPOSAL
  const handleUnusable = async () => {
    if (!statusReason.trim()) { toast.error("사유를 입력해주세요"); return; }
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "UNUSABLE", reason: statusReason }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "상태 변경 실패"); return; }
      const result = await res.json();
      setAsset((p) => (p ? { ...p, status: result.asset?.status ?? "PENDING_DISPOSAL", assignee: null } : null));
      toast.success("불용 처리되었습니다 (폐기 대상으로 전환)");
      setShowUnusableModal(false); setStatusReason("");
      loadHistory();
    } catch { toast.error("상태 변경 실패"); }
    finally { setIsUpdatingStatus(false); }
  };

  // 폐기 완료
  const handleDisposed = async () => {
    if (!statusReason.trim()) { toast.error("사유를 입력해주세요"); return; }
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISPOSED", reason: statusReason }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "상태 변경 실패"); return; }
      setAsset((p) => (p ? { ...p, status: "DISPOSED" } : null));
      toast.success("폐기 완료 처리되었습니다");
      setShowDisposedModal(false); setStatusReason("");
    } catch { toast.error("상태 변경 실패"); }
    finally { setIsUpdatingStatus(false); }
  };

  // 할당
  const handleAssign = async () => {
    if (!selectedEmployeeId) { toast.error("조직원을 선택해주세요"); return; }
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployeeId, reason: assignReason || undefined }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "할당 실패"); return; }
      toast.success("할당되었습니다");
      setShowAssignModal(false); setAssignReason(""); setSelectedEmployeeId("");
      loadAsset(); loadHistory();
    } catch { toast.error("할당 실패"); }
    finally { setIsAssigning(false); }
  };

  // 회수
  const handleUnassign = async () => {
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unassignReason || undefined }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "회수 실패"); return; }
      toast.success("회수되었습니다");
      setShowUnassignModal(false); setUnassignReason("");
      loadAsset(); loadHistory();
    } catch { toast.error("회수 실패"); }
    finally { setIsAssigning(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-gray-600">로딩 중...</p></div></div>;
  if (!asset) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-red-600">자산을 찾을 수 없습니다</p><div className="mt-4 text-center"><Link href="/hardware" className="text-blue-600 hover:underline">목록으로</Link></div></div></div>;

  const fmtCost = (v: number | null | undefined) => v != null ? (asset.currency === "KRW" ? `${v.toLocaleString("ko-KR")}원` : `${asset.currency} ${v.toLocaleString()}`) : "—";
  const hd = asset.hardwareDetail;
  const deviceType = hd?.deviceType ?? "";

  // Status button visibility
  const canMarkUnusable = isAdmin && ["IN_STOCK", "IN_USE", "INACTIVE"].includes(asset.status);
  const canMarkDisposed = isAdmin && asset.status === "PENDING_DISPOSAL";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/hardware" className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
            <p className="mt-1 text-sm text-gray-500">하드웨어 &bull; 등록일: {new Date(asset.createdAt).toLocaleDateString("ko-KR")}</p>
          </div>
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>{STATUS_LABELS[asset.status]}</span>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">비용</p><p className="mt-2 text-2xl font-bold">{fmtCost(asset.cost)}</p></div>
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">장비 유형</p><p className="mt-2 text-2xl font-bold text-gray-900">{deviceType || "—"}</p></div>
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">제조사 / 모델</p><p className="mt-2 text-lg font-bold text-gray-900">{[hd?.manufacturer, hd?.model].filter(Boolean).join(" ") || "—"}</p></div>
        </div>

        {/* 상태 관리 (Admin only) */}
        {isAdmin && (canMarkUnusable || canMarkDisposed) && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">상태 관리</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">현재 상태:</span>
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>{STATUS_LABELS[asset.status]}</span>
            </div>
            <div className="mt-4 flex gap-3">
              {canMarkUnusable && (
                <button
                  onClick={() => setShowUnusableModal(true)}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  불용 처리
                </button>
              )}
              {canMarkDisposed && (
                <button
                  onClick={() => setShowDisposedModal(true)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  폐기 완료
                </button>
              )}
            </div>
            {canMarkUnusable && (
              <p className="mt-3 text-xs text-gray-500">※ 불용 처리 시 자동으로 폐기 대상으로 전환됩니다</p>
            )}
          </div>
        )}

        {/* 할당 정보 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">할당 정보</h2>
          {asset.assignee ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">현재 할당자</p>
                <p className="mt-1 text-gray-900">
                  <Link href={`/employees/${asset.assignee.id}`} className="text-blue-600 hover:underline">{asset.assignee.name}</Link>
                </p>
              </div>
              {isAdmin && !["UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"].includes(asset.status) && (
                <button
                  onClick={() => setShowUnassignModal(true)}
                  className="flex items-center gap-2 rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
                >
                  <UserMinus className="h-4 w-4" />회수
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">할당된 조직원이 없습니다</p>
              {isAdmin && !["UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"].includes(asset.status) && (
                <button
                  onClick={() => { setShowAssignModal(true); loadEmployees(""); }}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />할당
                </button>
              )}
            </div>
          )}

          {/* Assignment History */}
          {assignHistory.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">할당 이력</h3>
              <div className="space-y-2">
                {assignHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2">
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${h.action === "ASSIGNED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {h.action === "ASSIGNED" ? "할당" : "회수"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-900">{h.employee.name}</span>
                      {h.reason && <span className="ml-2 text-xs text-gray-500">({h.reason})</span>}
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString("ko-KR")}</time>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 상세 정보 */}
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
            <div className="border-t border-gray-200 pt-4"><p className="text-xs text-gray-500">생성: {new Date(asset.createdAt).toLocaleString("ko-KR")} &bull; 수정: {new Date(asset.updatedAt).toLocaleString("ko-KR")}</p></div>
          </div>
        </div>

        {/* 장비 정보 */}
        {hd && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">장비 정보</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hd.assetTag && <div><p className="text-sm text-gray-600">내부 자산 ID</p><p className="mt-1 font-mono text-gray-900">{hd.assetTag}</p></div>}
              {hd.deviceType && <div><p className="text-sm text-gray-600">장비 유형</p><p className="mt-1 text-gray-900">{hd.deviceType}</p></div>}
              {hd.manufacturer && <div><p className="text-sm text-gray-600">제조사</p><p className="mt-1 text-gray-900">{hd.manufacturer}</p></div>}
              {hd.model && <div><p className="text-sm text-gray-600">모델명</p><p className="mt-1 text-gray-900">{hd.model}</p></div>}
              {hd.serialNumber && <div><p className="text-sm text-gray-600">시리얼 넘버</p><p className="mt-1 font-mono text-gray-900">{hd.serialNumber}</p></div>}

              {/* PC Spec fields */}
              {SHOW_SPEC_FIELDS.has(deviceType) && hd.cpu && <div><p className="text-sm text-gray-600">CPU</p><p className="mt-1 text-gray-900">{hd.cpu}</p></div>}
              {SHOW_SPEC_FIELDS.has(deviceType) && hd.ram && <div><p className="text-sm text-gray-600">RAM</p><p className="mt-1 text-gray-900">{hd.ram}</p></div>}
              {SHOW_SPEC_FIELDS.has(deviceType) && hd.storage && <div><p className="text-sm text-gray-600">저장장치</p><p className="mt-1 text-gray-900">{hd.storage}</p></div>}
              {SHOW_GPU.has(deviceType) && hd.gpu && <div><p className="text-sm text-gray-600">GPU</p><p className="mt-1 text-gray-900">{hd.gpu}</p></div>}
              {SHOW_DISPLAY.has(deviceType) && hd.displaySize && <div><p className="text-sm text-gray-600">화면 크기</p><p className="mt-1 text-gray-900">{hd.displaySize}</p></div>}

              {hd.hostname && <div><p className="text-sm text-gray-600">Hostname</p><p className="mt-1 font-mono text-gray-900">{hd.hostname}</p></div>}

              {/* IP/MAC - Server, Network only */}
              {SHOW_NETWORK_FIELDS.has(deviceType) && hd.ipAddress && <div><p className="text-sm text-gray-600">IP Address</p><p className="mt-1 font-mono text-gray-900">{hd.ipAddress}</p></div>}
              {SHOW_NETWORK_FIELDS.has(deviceType) && hd.macAddress && <div><p className="text-sm text-gray-600">MAC Address</p><p className="mt-1 font-mono text-gray-900">{hd.macAddress}</p></div>}

              {hd.os && <div><p className="text-sm text-gray-600">OS</p><p className="mt-1 text-gray-900">{hd.os}{hd.osVersion && ` ${hd.osVersion}`}</p></div>}
              {hd.location && <div><p className="text-sm text-gray-600">보관 위치</p><p className="mt-1 text-gray-900">{hd.location}</p></div>}
            </div>
          </div>
        )}

        {/* 감가상각 */}
        {asset.cost != null && asset.cost > 0 && asset.purchaseDate && (() => {
          const purchaseCost = Number(asset.cost);
          const usefulLife = hd?.usefulLifeYears ?? 5;
          const annualDep = Math.floor(purchaseCost / usefulLife);
          const monthlyDep = Math.floor(annualDep / 12);
          const elapsedMs = Date.now() - new Date(asset.purchaseDate!).getTime();
          const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
          const accumulated = Math.min(purchaseCost, Math.floor(annualDep * elapsedYears));
          const residual = Math.max(0, purchaseCost - accumulated);
          const pct = Math.min(100, (accumulated / purchaseCost) * 100);
          const elapsedMonths = elapsedYears * 12;
          return (
            <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">감가상각 (정액법)</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><p className="text-sm text-gray-600">취득가액</p><p className="mt-1 text-lg font-semibold text-gray-900">{purchaseCost.toLocaleString("ko-KR")}원</p></div>
                <div><p className="text-sm text-gray-600">내용연수</p><p className="mt-1 text-lg font-semibold text-gray-900">{usefulLife}년</p></div>
                <div><p className="text-sm text-gray-600">연 감가액</p><p className="mt-1 text-lg font-semibold text-gray-900">{annualDep.toLocaleString("ko-KR")}원</p></div>
                <div><p className="text-sm text-gray-600">월 감가액</p><p className="mt-1 text-lg font-semibold text-gray-900">{monthlyDep.toLocaleString("ko-KR")}원</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-600">누적 감가상각</p><p className="mt-1 text-lg font-semibold text-red-600">-{accumulated.toLocaleString("ko-KR")}원</p></div>
                <div><p className="text-sm text-gray-600">잔존가치</p><p className="mt-1 text-lg font-semibold text-blue-600">{residual.toLocaleString("ko-KR")}원</p></div>
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

        {/* Action Buttons (Admin) */}
        {isAdmin && asset.status !== "DISPOSED" && (
          <div className="flex gap-3">
            <Link href={`/hardware/${asset.id}/edit`} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Edit className="h-4 w-4" />수정</Link>
            <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />삭제</button>
          </div>
        )}

        {/* 불용 처리 모달 */}
        {showUnusableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold">불용 처리</h2>
              </div>
              <p className="mb-2 text-sm text-gray-600">이 자산을 불용 처리하시겠습니까?</p>
              <p className="mb-4 rounded-md bg-orange-50 p-3 text-xs text-orange-700">불용 처리 시 자동으로 <strong>폐기 대상</strong>으로 전환됩니다. 할당 중인 경우 자동 회수됩니다.</p>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">사유 <span className="text-red-500">*</span></label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="불용 처리 사유를 입력하세요"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleUnusable} disabled={isUpdatingStatus || !statusReason.trim()} className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">{isUpdatingStatus ? "처리 중..." : "불용 처리"}</button>
                <button onClick={() => { setShowUnusableModal(false); setStatusReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
              </div>
            </div>
          </div>
        )}

        {/* 폐기 완료 모달 */}
        {showDisposedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold">폐기 완료</h2>
              </div>
              <p className="mb-2 text-sm text-gray-600">이 자산을 폐기 완료 처리하시겠습니까?</p>
              <p className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-700"><strong>폐기 완료 후에는 되돌릴 수 없습니다.</strong></p>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">사유 <span className="text-red-500">*</span></label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="폐기 완료 사유를 입력하세요"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleDisposed} disabled={isUpdatingStatus || !statusReason.trim()} className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{isUpdatingStatus ? "처리 중..." : "폐기 완료"}</button>
                <button onClick={() => { setShowDisposedModal(false); setStatusReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
              </div>
            </div>
          </div>
        )}

        {/* 할당 모달 */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold">자산 할당</h2>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">조직원 검색</label>
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => { setEmployeeSearch(e.target.value); loadEmployees(e.target.value); }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="이름으로 검색..."
                />
              </div>
              <div className="mb-4 max-h-48 overflow-y-auto rounded-md border border-gray-200">
                {employees.length === 0 ? (
                  <p className="p-3 text-center text-sm text-gray-500">조직원이 없습니다</p>
                ) : (
                  employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${selectedEmployeeId === emp.id ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"}`}
                    >
                      {emp.name}{emp.department ? ` (${emp.department})` : ""}{emp.email ? ` — ${emp.email}` : ""}
                    </button>
                  ))
                )}
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">사유 (선택)</label>
                <input
                  type="text"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="예: 신규 입사 장비 지급"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAssign} disabled={isAssigning || !selectedEmployeeId} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isAssigning ? "할당 중..." : "할당"}</button>
                <button onClick={() => { setShowAssignModal(false); setSelectedEmployeeId(""); setEmployeeSearch(""); setAssignReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
              </div>
            </div>
          </div>
        )}

        {/* 회수 모달 */}
        {showUnassignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold">자산 회수</h2>
              <p className="mb-4 text-sm text-gray-600">&quot;{asset.assignee?.name}&quot;으로부터 자산을 회수합니다.</p>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">사유 (선택)</label>
                <input
                  type="text"
                  value={unassignReason}
                  onChange={(e) => setUnassignReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="예: 퇴사로 인한 장비 회수"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleUnassign} disabled={isAssigning} className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">{isAssigning ? "회수 중..." : "회수"}</button>
                <button onClick={() => { setShowUnassignModal(false); setUnassignReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 모달 */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
