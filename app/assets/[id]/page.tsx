"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AssetType = "SOFTWARE" | "CLOUD" | "HARDWARE" | "DOMAIN_SSL" | "OTHER";
type AssetStatus = "ACTIVE" | "INACTIVE" | "DISPOSED";

interface Asset {
  id: number;
  name: string;
  type: AssetType;
  status: AssetStatus;
  description?: string | null;
  vendor?: string | null;
  cost?: number | null;
  monthlyCost?: number | null;
  currency: string;
  billingCycle?: string | null;
  expiryDate?: string | null;
  purchaseDate?: string | null;
  assignee?: { id: number; name: string } | null;
  orgUnit?: { id: number; name: string } | null;
  company?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  SOFTWARE: "소프트웨어",
  CLOUD: "클라우드",
  HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인·SSL",
  OTHER: "기타",
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  ACTIVE: "사용 중",
  INACTIVE: "미사용",
  DISPOSED: "폐기",
};

const STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  DISPOSED: "bg-red-100 text-red-800",
};

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user } = useAuth();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<AssetStatus>("ACTIVE");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const loadAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${assetId}`);
        if (!response.ok) {
          if (response.status === 404) toast.error("자산을 찾을 수 없습니다");
          else toast.error("자산을 로드할 수 없습니다");
          router.push("/assets");
          return;
        }
        const data = await response.json();
        setAsset(data);
        setNewStatus(data.status);
      } catch (error) {
        console.error("자산 로드 실패:", error);
        toast.error("자산을 로드할 수 없습니다");
        router.push("/assets");
      } finally {
        setIsLoading(false);
      }
    };

    loadAsset();
  }, [assetId, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || "자산 삭제에 실패했습니다");
        return;
      }
      toast.success("자산이 삭제되었습니다");
      router.push("/assets");
    } catch (error) {
      console.error("자산 삭제 실패:", error);
      toast.error("자산 삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleStatusChange = async () => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || "자산 상태 변경에 실패했습니다");
        return;
      }
      setAsset((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success("자산 상태가 변경되었습니다");
      setShowStatusModal(false);
    } catch (error) {
      console.error("자산 상태 변경 실패:", error);
      toast.error("자산 상태 변경에 실패했습니다");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-red-600">자산을 찾을 수 없습니다</p>
          <div className="mt-4 text-center">
            <Link href="/assets" className="text-blue-600 hover:underline">
              자산 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/assets" className="rounded-md p-2 hover:bg-gray-200" title="돌아가기">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {ASSET_TYPE_LABELS[asset.type]} • 등록일: {new Date(asset.createdAt).toLocaleDateString("ko-KR")}
            </p>
          </div>
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>
            {STATUS_LABELS[asset.status]}
          </span>
        </div>

        {/* 주요 정보 카드 */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">비용</p>
            <p className="mt-2 text-2xl font-bold">
              {asset.cost != null
                ? asset.currency === "KRW"
                  ? `${asset.cost.toLocaleString("ko-KR")}원`
                  : `${asset.currency} ${asset.cost.toLocaleString()}`
                : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">유형</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{ASSET_TYPE_LABELS[asset.type]}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">만료일</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString("ko-KR") : "—"}
            </p>
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">상세 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">자산명</p>
                <p className="mt-1 text-gray-900">{asset.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">유형</p>
                <p className="mt-1 text-gray-900">{ASSET_TYPE_LABELS[asset.type]}</p>
              </div>
            </div>

            {asset.vendor && (
              <div>
                <p className="text-sm text-gray-600">공급업체</p>
                <p className="mt-1 text-gray-900">{asset.vendor}</p>
              </div>
            )}

            {asset.description && (
              <div>
                <p className="text-sm text-gray-600">설명</p>
                <p className="mt-1 text-gray-900">{asset.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">비용</p>
                <p className="mt-1 text-gray-900">
                  {asset.cost != null
                    ? asset.currency === "KRW"
                      ? `${asset.cost.toLocaleString("ko-KR")}원`
                      : `${asset.currency} ${asset.cost.toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">월 비용</p>
                <p className="mt-1 text-gray-900">
                  {asset.monthlyCost != null ? `${asset.monthlyCost.toLocaleString()}원` : "—"}
                </p>
              </div>
            </div>

            {asset.expiryDate && (
              <div>
                <p className="text-sm text-gray-600">만료일</p>
                <p className="mt-1 text-gray-900">{new Date(asset.expiryDate).toLocaleDateString("ko-KR")}</p>
              </div>
            )}

            {asset.assignee && (
              <div>
                <p className="text-sm text-gray-600">담당자</p>
                <p className="mt-1 text-gray-900">
                  <Link href={`/employees/${asset.assignee.id}`} className="text-blue-600 hover:underline">
                    {asset.assignee.name}
                  </Link>
                </p>
              </div>
            )}

            {(asset.company || asset.orgUnit) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {asset.company && (
                  <div>
                    <p className="text-sm text-gray-600">회사</p>
                    <p className="mt-1 text-gray-900">{asset.company.name}</p>
                  </div>
                )}
                {asset.orgUnit && (
                  <div>
                    <p className="text-sm text-gray-600">조직</p>
                    <p className="mt-1 text-gray-900">{asset.orgUnit.name}</p>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                생성: {new Date(asset.createdAt).toLocaleString("ko-KR")} • 수정:{" "}
                {new Date(asset.updatedAt).toLocaleString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 (인증 사용자만) */}
        {user && (
          <div className="flex gap-3">
            <Link
              href={`/assets/${asset.id}/edit`}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Edit className="h-4 w-4" />
              수정
            </Link>
            <button
              onClick={() => setShowStatusModal(true)}
              className="flex-1 rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              상태 변경
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          </div>
        )}

        {/* 상태 변경 모달 */}
        {showStatusModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold">상태 변경</h2>
              <div className="mb-6 space-y-2">
                {(Object.keys(STATUS_LABELS) as AssetStatus[]).map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={newStatus === status}
                      onChange={(e) => setNewStatus(e.target.value as AssetStatus)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">{STATUS_LABELS[status]}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleStatusChange}
                  disabled={isUpdatingStatus || newStatus === asset.status}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  변경
                </button>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold">자산 삭제</h2>
              </div>
              <p className="mb-6 text-sm text-gray-600">
                정말로 "{asset.name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
