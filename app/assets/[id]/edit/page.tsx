"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AssetType = "SOFTWARE" | "CLOUD" | "HARDWARE" | "DOMAIN_SSL" | "OTHER";

interface FormState {
  name: string;
  type: AssetType | "";
  description: string;
  cost: string;
  currency: string;
  billingCycle: string;
  expiryDate: string;
}

const ASSET_TYPES: Array<{ value: AssetType; label: string }> = [
  { value: "SOFTWARE", label: "소프트웨어" },
  { value: "CLOUD", label: "클라우드" },
  { value: "HARDWARE", label: "하드웨어" },
  { value: "DOMAIN_SSL", label: "도메인·SSL" },
  { value: "OTHER", label: "기타" },
];

const CURRENCIES = ["USD", "KRW", "EUR", "JPY", "GBP", "CNY"];
const BILLING_CYCLES = [
  { value: "MONTHLY", label: "월간" },
  { value: "ANNUAL", label: "연간" },
  { value: "ONE_TIME", label: "일회성" },
];

export default function AssetEditPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const [formData, setFormData] = useState<FormState>({
    name: "",
    type: "",
    description: "",
    cost: "",
    currency: "USD",
    billingCycle: "MONTHLY",
    expiryDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${assetId}`);
        if (!response.ok) {
          toast.error("자산을 로드할 수 없습니다");
          router.push("/assets");
          return;
        }
        const data = await response.json();
        setFormData({
          name: data.name || "",
          type: data.type || "",
          description: data.description || "",
          cost: data.cost != null ? String(data.cost) : "",
          currency: data.currency || "USD",
          billingCycle: data.billingCycle || "MONTHLY",
          expiryDate: data.expiryDate ? data.expiryDate.split("T")[0] : "",
        });
      } catch (error) {
        console.error("자산 로드 실패:", error);
        toast.error("자산을 로드할 수 없습니다");
        router.push("/assets");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadAsset();
  }, [assetId, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "자산명은 필수입니다";
    } else if (formData.name.length > 255) {
      newErrors.name = "자산명은 255자 이하여야 합니다";
    }

    if (!formData.type) {
      newErrors.type = "자산 유형은 필수입니다";
    }

    if (formData.cost && (isNaN(Number(formData.cost)) || Number(formData.cost) < 0)) {
      newErrors.cost = "유효한 비용을 입력해주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("입력 값을 확인해주세요");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          cost: formData.cost ? Number(formData.cost) : null,
          currency: formData.currency,
          billingCycle: formData.billingCycle,
          expiryDate: formData.expiryDate || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "자산 수정에 실패했습니다");

      toast.success("자산이 수정되었습니다");
      router.push(`/assets/${assetId}`);
    } catch (error) {
      console.error("자산 수정 실패:", error);
      toast.error(error instanceof Error ? error.message : "자산 수정에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-center text-gray-500">{authLoading ? "로딩 중..." : "로그인이 필요합니다."}</p>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-center text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8 flex items-center gap-4">
          <Link href={`/assets/${assetId}`} className="rounded-md p-2 hover:bg-gray-200" title="돌아가기">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">자산 수정</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {/* 자산명 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                자산명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="자산 이름을 입력해주세요"
                className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${errors.name ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* 자산 유형 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                자산 유형 <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${errors.type ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
              >
                <option value="">선택해주세요</option>
                {ASSET_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
            </div>

            {/* 설명 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="자산에 대한 설명을 입력해주세요 (선택)"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 비용 행 */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비용</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${errors.cost ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"}`}
                />
                {errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">통화</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비용 주기</label>
                <select
                  name="billingCycle"
                  value={formData.billingCycle}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BILLING_CYCLES.map((cycle) => (
                    <option key={cycle.value} value={cycle.value}>{cycle.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 만료일 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">만료일</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">선택 사항입니다</p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "수정 중..." : "자산 수정"}
            </button>
            <Link
              href={`/assets/${assetId}`}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
