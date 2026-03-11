"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CURRENCIES = ["USD", "KRW", "EUR", "JPY", "GBP", "CNY"];
const BILLING_CYCLES = [{ value: "ANNUAL", label: "연간" }, { value: "MONTHLY", label: "월간" }, { value: "ONE_TIME", label: "일회성" }, { value: "USAGE_BASED", label: "사용량 기반" }];

export default function DomainEditPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  const [form, setForm] = useState({ name: "", description: "", vendor: "", cost: "", currency: "KRW", billingCycle: "ANNUAL", purchaseDate: "", expiryDate: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error("로드 실패"); router.push("/domains"); return; }
        const d = await res.json();
        setForm({ name: d.name || "", description: d.description || "", vendor: d.vendor || "", cost: d.cost != null ? String(d.cost) : "", currency: d.currency || "KRW", billingCycle: d.billingCycle || "ANNUAL", purchaseDate: d.purchaseDate ? d.purchaseDate.split("T")[0] : "", expiryDate: d.expiryDate ? d.expiryDate.split("T")[0] : "" });
      } catch { toast.error("로드 실패"); router.push("/domains"); }
      finally { setIsLoadingData(false); }
    })();
  }, [assetId, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "도메인명은 필수입니다";
    if (form.cost && (isNaN(Number(form.cost)) || Number(form.cost) < 0)) e.cost = "유효한 비용";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error("입력 값 확인"); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "DOMAIN_SSL", description: form.description || null,
        vendor: form.vendor || null, cost: form.cost ? Number(form.cost) : null,
        currency: form.currency, billingCycle: form.billingCycle,
        purchaseDate: form.purchaseDate || null, expiryDate: form.expiryDate || null,
      };
      const res = await fetch(`/api/assets/${assetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "수정 실패");
      toast.success("수정되었습니다"); router.push(`/domains/${assetId}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "수정 실패"); }
    finally { setIsLoading(false); }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-500">{authLoading ? "로딩 중..." : "로그인 필요"}</p></div></div>;
  if (isLoadingData) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-600">로딩 중...</p></div></div>;

  const ic = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const ec = "w-full rounded-md border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href={`/domains/${assetId}`} className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">도메인·SSL 수정</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">기본 정보</h2>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">도메인명 <span className="text-red-500">*</span></label><input type="text" name="name" value={form.name} onChange={onChange} className={errors.name ? ec : ic} />{errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}</div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">공급업체</label><input type="text" name="vendor" value={form.vendor} onChange={onChange} className={ic} /></div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">설명</label><textarea name="description" value={form.description} onChange={onChange} rows={3} className={ic} /></div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">비용</label><input type="number" name="cost" value={form.cost} onChange={onChange} min="0" step="0.01" className={errors.cost ? ec : ic} />{errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">통화</label><select name="currency" value={form.currency} onChange={onChange} className={ic}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">비용 주기</label><select name="billingCycle" value={form.billingCycle} onChange={onChange} className={ic}>{BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">구매일 / 등록일</label><input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">만료일</label><input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={ic} /></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isLoading ? "수정 중..." : "수정"}</button>
            <Link href={`/domains/${assetId}`} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">취소</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
