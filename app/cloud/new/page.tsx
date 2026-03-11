"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CURRENCIES = ["USD", "KRW", "EUR", "JPY", "GBP", "CNY"];
const BILLING_CYCLES = [
  { value: "MONTHLY", label: "월간" },
  { value: "ANNUAL", label: "연간" },
  { value: "ONE_TIME", label: "일회성" },
  { value: "USAGE_BASED", label: "사용량 기반" },
];

const PLATFORMS = ["AWS", "GCP", "Azure", "Slack", "Notion", "Jira", "GitHub", "GitLab", "Figma", "Vercel", "Datadog", "Other"];

export default function CloudNewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const [form, setForm] = useState({
    name: "", description: "", vendor: "", cost: "", currency: "KRW",
    billingCycle: "MONTHLY", purchaseDate: "", expiryDate: "",
  });
  const [cloud, setCloud] = useState({ platform: "", accountId: "", region: "", seatCount: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "자산명은 필수입니다";
    if (!form.cost) e.cost = "비용은 필수입니다";
    else if (isNaN(Number(form.cost)) || Number(form.cost) < 0) e.cost = "유효한 비용을 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const onCloudChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCloud((p) => ({ ...p, [name]: value }));
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-500">{loading ? "로딩 중..." : "로그인이 필요합니다."}</p></div></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error("입력 값을 확인해주세요"); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "CLOUD", description: form.description || null,
        vendor: form.vendor || null, cost: Number(form.cost), currency: form.currency,
        billingCycle: form.billingCycle, purchaseDate: form.purchaseDate || null,
        expiryDate: form.expiryDate || null,
        cloudDetail: {
          platform: cloud.platform || null, accountId: cloud.accountId || null,
          region: cloud.region || null, seatCount: cloud.seatCount ? Number(cloud.seatCount) : null,
        },
      };
      const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "등록 실패");
      toast.success("클라우드 자산이 등록되었습니다");
      router.push(`/cloud/${json.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록 실패");
    } finally { setIsLoading(false); }
  };

  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const errCls = "w-full rounded-md border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/cloud" className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">새 클라우드 자산 등록</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">기본 정보</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">자산명 <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={form.name} onChange={onChange} placeholder="자산 이름" className={errors.name ? errCls : inputCls} />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">공급업체</label>
              <input type="text" name="vendor" value={form.vendor} onChange={onChange} placeholder="공급업체 (선택)" className={inputCls} />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
              <textarea name="description" value={form.description} onChange={onChange} rows={3} placeholder="설명 (선택)" className={inputCls} />
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비용 <span className="text-red-500">*</span></label>
                <input type="number" name="cost" value={form.cost} onChange={onChange} placeholder="0" min="0" step="0.01" className={errors.cost ? errCls : inputCls} />
                {errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">통화</label>
                <select name="currency" value={form.currency} onChange={onChange} className={inputCls}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비용 주기</label>
                <select name="billingCycle" value={form.billingCycle} onChange={onChange} className={inputCls}>
                  {BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">구매일</label>
                <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">만료일</label>
                <input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">클라우드 상세 정보</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">플랫폼</label>
                <select name="platform" value={cloud.platform} onChange={onCloudChange} className={inputCls}>
                  <option value="">선택해주세요</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">계정 ID</label>
                <input type="text" name="accountId" value={cloud.accountId} onChange={onCloudChange} placeholder="계정 ID 또는 이메일" className={inputCls} />
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">리전</label>
                <input type="text" name="region" value={cloud.region} onChange={onCloudChange} placeholder="ap-northeast-2 등" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시트 수</label>
                <input type="number" name="seatCount" value={cloud.seatCount} onChange={onCloudChange} placeholder="0" min="0" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? "등록 중..." : "클라우드 등록"}
            </button>
            <Link href="/cloud" className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">취소</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
