"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type AssetType = "SOFTWARE" | "CLOUD" | "HARDWARE" | "DOMAIN_SSL" | "OTHER";

interface FormData {
  name: string;
  type: AssetType | "";
  description: string;
  cost: string;
  currency: string;
  billingCycle: string;
  expiryDate: string;
  assignedToId: string;
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

export default function AssetNewPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "",
    description: "",
    cost: "",
    currency: "USD",
    billingCycle: "MONTHLY",
    expiryDate: "",
    assignedToId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (!formData.cost) {
      newErrors.cost = "비용은 필수입니다";
    } else if (isNaN(Number(formData.cost)) || Number(formData.cost) < 0) {
      newErrors.cost = "유효한 비용을 입력해주세요";
    }

    if (formData.expiryDate) {
      const date = new Date(formData.expiryDate);
      if (isNaN(date.getTime())) {
        newErrors.expiryDate = "유효한 날짜를 입력해주세요";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 입력 시 해당 필드의 에러 제거
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          cost: Number(formData.cost),
          currency: formData.currency,
          billingCycle: formData.billingCycle,
          expiryDate: formData.expiryDate || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "자산 등록에 실패했습니다");

      toast.success("자산이 등록되었습니다");
      router.push(`/assets/${json.id}`);
    } catch (error) {
      console.error("자산 등록 실패:", error);
      toast.error(error instanceof Error ? error.message : "자산 등록에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/assets"
            className="rounded-md p-2 hover:bg-gray-200"
            title="돌아가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">새 자산 등록</h1>
        </div>

        {/* 폼 */}
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
                className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
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
                className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.type
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="">선택해주세요</option>
                {ASSET_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
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
              {/* 비용 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비용 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                    errors.cost
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}
              </div>

              {/* 통화 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">통화</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>

              {/* 비용 주기 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비용 주기
                </label>
                <select
                  name="billingCycle"
                  value={formData.billingCycle}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BILLING_CYCLES.map((cycle) => (
                    <option key={cycle.value} value={cycle.value}>
                      {cycle.label}
                    </option>
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
                className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  errors.expiryDate
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              />
              {errors.expiryDate && (
                <p className="mt-1 text-sm text-red-500">{errors.expiryDate}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">선택 사항입니다</p>
            </div>

            {/* 담당자 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">담당자</label>
              <input
                type="text"
                name="assignedToId"
                value={formData.assignedToId}
                onChange={handleChange}
                placeholder="담당자를 선택해주세요 (선택)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">담당자 ID (선택)</p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "등록 중..." : "자산 등록"}
            </button>
            <Link
              href="/assets"
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
