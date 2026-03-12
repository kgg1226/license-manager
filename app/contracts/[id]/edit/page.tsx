"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CURRENCIES = ["USD", "KRW", "EUR", "JPY", "GBP", "CNY"];
const BILLING_CYCLES = [
  { value: "MONTHLY", label: "월간" },
  { value: "ANNUAL", label: "연간" },
  { value: "ONE_TIME", label: "일회성" },
];
const CONTRACT_TYPES = ["유지보수", "라이선스", "구독", "용역", "임대", "기타"];

export default function ContractEditPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  const [form, setForm] = useState({ name: "", description: "", vendor: "", cost: "", currency: "KRW", billingCycle: "ANNUAL", purchaseDate: "", expiryDate: "" });
  const [contract, setContract] = useState({ contractNumber: "", counterparty: "", contractType: "", autoRenew: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error("로드 실패"); router.push("/contracts"); return; }
        const d = await res.json();
        setForm({ name: d.name || "", description: d.description || "", vendor: d.vendor || "", cost: d.cost != null ? String(d.cost) : "", currency: d.currency || "KRW", billingCycle: d.billingCycle || "ANNUAL", purchaseDate: d.purchaseDate ? d.purchaseDate.split("T")[0] : "", expiryDate: d.expiryDate ? d.expiryDate.split("T")[0] : "" });
        if (d.contractDetail) {
          const cd = d.contractDetail;
          setContract({ contractNumber: cd.contractNumber || "", counterparty: cd.counterparty || "", contractType: cd.contractType || "", autoRenew: cd.autoRenew || false });
        }
      } catch { toast.error("로드 실패"); router.push("/contracts"); }
      finally { setIsLoadingData(false); }
    })();
  }, [assetId, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "계약명은 필수입니다";
    if (form.cost && (isNaN(Number(form.cost)) || Number(form.cost) < 0)) e.cost = "유효한 비용을 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };
  const onContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setContract((p) => ({ ...p, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error("입력 값을 확인해주세요"); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "CONTRACT", description: form.description || null,
        vendor: form.vendor || null, cost: form.cost ? Number(form.cost) : null,
        currency: form.currency, billingCycle: form.billingCycle,
        purchaseDate: form.purchaseDate || null, expiryDate: form.expiryDate || null,
        contractDetail: { contractNumber: contract.contractNumber || null, counterparty: contract.counterparty || null, contractType: contract.contractType || null, autoRenew: contract.autoRenew },
      };
      const res = await fetch(`/api/assets/${assetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "수정 실패");
      toast.success("수정되었습니다");
      router.push(`/contracts/${assetId}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "수정 실패"); }
    finally { setIsLoading(false); }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-500">{authLoading ? "로딩 중..." : "로그인이 필요합니다."}</p></div></div>;
  if (isLoadingData) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-600">로딩 중...</p></div></div>;

  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const errCls = "w-full rounded-md border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href={`/contracts/${assetId}`} className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">계약 수정</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">기본 정보</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">계약명 <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={form.name} onChange={onChange} className={errors.name ? errCls : inputCls} />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">공급업체</label>
              <input type="text" name="vendor" value={form.vendor} onChange={onChange} className={inputCls} />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
              <textarea name="description" value={form.description} onChange={onChange} rows={3} className={inputCls} />
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비용</label>
                <input type="number" name="cost" value={form.cost} onChange={onChange} min="0" step="0.01" className={errors.cost ? errCls : inputCls} />
                {errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">통화</label>
                <select name="currency" value={form.currency} onChange={onChange} className={inputCls}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비용 주기</label>
                <select name="billingCycle" value={form.billingCycle} onChange={onChange} className={inputCls}>{BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">계약 시작일</label><input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">만료일</label><input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={inputCls} /></div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">계약 상세 정보</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">계약 번호</label><input type="text" name="contractNumber" value={contract.contractNumber} onChange={onContractChange} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">거래처</label><input type="text" name="counterparty" value={contract.counterparty} onChange={onContractChange} className={inputCls} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">계약 유형</label>
                <select name="contractType" value={contract.contractType} onChange={onContractChange} className={inputCls}>
                  <option value="">선택</option>
                  {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="autoRenew" checked={contract.autoRenew} onChange={onContractChange} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">자동 갱신</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isLoading ? "수정 중..." : "수정"}</button>
            <Link href={`/contracts/${assetId}`} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">취소</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
