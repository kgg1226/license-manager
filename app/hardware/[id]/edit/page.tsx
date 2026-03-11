"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CURRENCIES = ["USD", "KRW", "EUR", "JPY", "GBP", "CNY"];
const BILLING_CYCLES = [{ value: "ONE_TIME", label: "일회성" }, { value: "MONTHLY", label: "월간" }, { value: "ANNUAL", label: "연간" }, { value: "USAGE_BASED", label: "사용량 기반" }];
const DEVICE_TYPES = ["Laptop", "Desktop", "Server", "Network", "Mobile", "Other"];

export default function HardwareEditPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  const [form, setForm] = useState({ name: "", description: "", vendor: "", cost: "", currency: "KRW", billingCycle: "ONE_TIME", purchaseDate: "", expiryDate: "" });
  const [hw, setHw] = useState({ assetTag: "", deviceType: "", manufacturer: "", model: "", serialNumber: "", hostname: "", macAddress: "", ipAddress: "", os: "", osVersion: "", location: "", usefulLifeYears: "5" });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error("로드 실패"); router.push("/hardware"); return; }
        const d = await res.json();
        setForm({ name: d.name || "", description: d.description || "", vendor: d.vendor || "", cost: d.cost != null ? String(d.cost) : "", currency: d.currency || "KRW", billingCycle: d.billingCycle || "ONE_TIME", purchaseDate: d.purchaseDate ? d.purchaseDate.split("T")[0] : "", expiryDate: d.expiryDate ? d.expiryDate.split("T")[0] : "" });
        if (d.hardwareDetail) {
          const h = d.hardwareDetail;
          setHw({ assetTag: h.assetTag || "", deviceType: h.deviceType || "", manufacturer: h.manufacturer || "", model: h.model || "", serialNumber: h.serialNumber || "", hostname: h.hostname || "", macAddress: h.macAddress || "", ipAddress: h.ipAddress || "", os: h.os || "", osVersion: h.osVersion || "", location: h.location || "", usefulLifeYears: h.usefulLifeYears != null ? String(h.usefulLifeYears) : "5" });
        }
      } catch { toast.error("로드 실패"); router.push("/hardware"); }
      finally { setIsLoadingData(false); }
    })();
  }, [assetId, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "자산명은 필수입니다";
    if (form.cost && (isNaN(Number(form.cost)) || Number(form.cost) < 0)) e.cost = "유효한 비용";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value })); if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; }); };
  const onHwChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value } = e.target; setHw((p) => ({ ...p, [name]: value })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error("입력 값 확인"); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "HARDWARE", description: form.description || null, vendor: form.vendor || null,
        cost: form.cost ? Number(form.cost) : null, currency: form.currency, billingCycle: form.billingCycle,
        purchaseDate: form.purchaseDate || null, expiryDate: form.expiryDate || null,
        hardwareDetail: { assetTag: hw.assetTag || null, deviceType: hw.deviceType || null, manufacturer: hw.manufacturer || null, model: hw.model || null, serialNumber: hw.serialNumber || null, hostname: hw.hostname || null, macAddress: hw.macAddress || null, ipAddress: hw.ipAddress || null, os: hw.os || null, osVersion: hw.osVersion || null, location: hw.location || null, usefulLifeYears: hw.usefulLifeYears ? Number(hw.usefulLifeYears) : 5 },
      };
      const res = await fetch(`/api/assets/${assetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "수정 실패");
      toast.success("수정되었습니다"); router.push(`/hardware/${assetId}`);
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
          <Link href={`/hardware/${assetId}`} className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">하드웨어 수정</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">기본 정보</h2>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">자산명 <span className="text-red-500">*</span></label><input type="text" name="name" value={form.name} onChange={onChange} className={errors.name ? ec : ic} />{errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}</div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">공급업체</label><input type="text" name="vendor" value={form.vendor} onChange={onChange} className={ic} /></div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">설명</label><textarea name="description" value={form.description} onChange={onChange} rows={3} className={ic} /></div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">비용</label><input type="number" name="cost" value={form.cost} onChange={onChange} min="0" step="0.01" className={errors.cost ? ec : ic} />{errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">통화</label><select name="currency" value={form.currency} onChange={onChange} className={ic}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">비용 주기</label><select name="billingCycle" value={form.billingCycle} onChange={onChange} className={ic}>{BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">구매일</label><input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">만료일</label><input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={ic} /></div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">장비 상세 정보</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">내부 자산 ID</label><input type="text" name="assetTag" value={hw.assetTag} onChange={onHwChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">장비 유형</label><select name="deviceType" value={hw.deviceType} onChange={onHwChange} className={ic}><option value="">선택</option>{DEVICE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">제조사</label><input type="text" name="manufacturer" value={hw.manufacturer} onChange={onHwChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">모델명</label><input type="text" name="model" value={hw.model} onChange={onHwChange} className={ic} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">시리얼 넘버</label><input type="text" name="serialNumber" value={hw.serialNumber} onChange={onHwChange} className={`${ic} font-mono`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Hostname</label><input type="text" name="hostname" value={hw.hostname} onChange={onHwChange} className={`${ic} font-mono`} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">MAC Address</label><input type="text" name="macAddress" value={hw.macAddress} onChange={onHwChange} className={`${ic} font-mono`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label><input type="text" name="ipAddress" value={hw.ipAddress} onChange={onHwChange} className={`${ic} font-mono`} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">OS</label><select name="os" value={hw.os} onChange={onHwChange} className={ic}><option value="">선택</option><option value="macOS">macOS</option><option value="Windows">Windows</option><option value="Linux">Linux</option><option value="Other">기타</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">OS 버전</label><input type="text" name="osVersion" value={hw.osVersion} onChange={onHwChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">내용연수 (년)</label><input type="number" name="usefulLifeYears" value={hw.usefulLifeYears} onChange={onHwChange} min="1" max="50" className={ic} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">보관 위치</label><input type="text" name="location" value={hw.location} onChange={onHwChange} className={ic} /></div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isLoading ? "수정 중..." : "수정"}</button>
            <Link href={`/hardware/${assetId}`} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">취소</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
