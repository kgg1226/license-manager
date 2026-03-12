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
  { value: "USAGE_BASED", label: "사용량 기반" },
];
const PLATFORMS = ["AWS", "GCP", "Azure", "Slack", "Notion", "Jira", "GitHub", "GitLab", "Figma", "Vercel", "Datadog", "Other"];
const SERVICE_CATEGORIES = ["IaaS", "PaaS", "SaaS", "Security", "Database", "Storage", "Network", "Other"];
const RESOURCE_TYPES: Record<string, string[]> = {
  AWS: ["EC2", "S3", "RDS", "Lambda", "ECS", "ELB", "CloudFront", "Route53", "VPC", "SecurityGroup", "IAM", "EBS", "SQS", "SNS", "DynamoDB", "ElastiCache", "Redshift", "Other"],
  GCP: ["Compute Engine", "Cloud Storage", "Cloud SQL", "Cloud Functions", "GKE", "BigQuery", "Cloud CDN", "VPC", "IAM", "Other"],
  Azure: ["VM", "Blob Storage", "SQL Database", "Functions", "AKS", "CDN", "VNet", "Active Directory", "Other"],
  _default: ["Web/App", "Database", "Storage", "API", "Auth", "Monitoring", "CI/CD", "Other"],
};

export default function CloudEditPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  const [form, setForm] = useState({ name: "", description: "", vendor: "", cost: "", currency: "KRW", billingCycle: "MONTHLY", purchaseDate: "", expiryDate: "" });
  const [cloud, setCloud] = useState({
    platform: "", accountId: "", region: "", seatCount: "",
    serviceCategory: "", resourceType: "", resourceId: "",
    instanceSpec: "", storageSize: "", endpoint: "", vpcId: "", availabilityZone: "",
    contractStartDate: "", contractTermMonths: "", renewalDate: "", cancellationNoticeDate: "",
    cancellationNoticeDays: "", paymentMethod: "", contractNumber: "",
    adminEmail: "", adminSlackId: "", notifyChannels: "EMAIL", autoRenew: "", notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error("로드 실패"); router.push("/cloud"); return; }
        const d = await res.json();
        setForm({ name: d.name || "", description: d.description || "", vendor: d.vendor || "", cost: d.cost != null ? String(d.cost) : "", currency: d.currency || "KRW", billingCycle: d.billingCycle || "MONTHLY", purchaseDate: d.purchaseDate ? d.purchaseDate.split("T")[0] : "", expiryDate: d.expiryDate ? d.expiryDate.split("T")[0] : "" });
        if (d.cloudDetail) {
          const cd = d.cloudDetail;
          setCloud({
            platform: cd.platform || "", accountId: cd.accountId || "", region: cd.region || "",
            seatCount: cd.seatCount != null ? String(cd.seatCount) : "",
            serviceCategory: cd.serviceCategory || "", resourceType: cd.resourceType || "",
            resourceId: cd.resourceId || "", instanceSpec: cd.instanceSpec || "",
            storageSize: cd.storageSize || "", endpoint: cd.endpoint || "",
            vpcId: cd.vpcId || "", availabilityZone: cd.availabilityZone || "",
            contractStartDate: cd.contractStartDate ? cd.contractStartDate.split("T")[0] : "",
            contractTermMonths: cd.contractTermMonths != null ? String(cd.contractTermMonths) : "",
            renewalDate: cd.renewalDate ? cd.renewalDate.split("T")[0] : "",
            cancellationNoticeDate: cd.cancellationNoticeDate ? cd.cancellationNoticeDate.split("T")[0] : "",
            cancellationNoticeDays: cd.cancellationNoticeDays != null ? String(cd.cancellationNoticeDays) : "",
            paymentMethod: cd.paymentMethod || "", contractNumber: cd.contractNumber || "",
            adminEmail: cd.adminEmail || "", adminSlackId: cd.adminSlackId || "",
            notifyChannels: cd.notifyChannels || "EMAIL",
            autoRenew: cd.autoRenew === true ? "true" : cd.autoRenew === false ? "false" : "",
            notes: cd.notes || "",
          });
        }
      } catch { toast.error("로드 실패"); router.push("/cloud"); }
      finally { setIsLoadingData(false); }
    })();
  }, [assetId, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "자산명은 필수입니다";
    if (form.cost && (isNaN(Number(form.cost)) || Number(form.cost) < 0)) e.cost = "유효한 비용을 입력해주세요";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error("입력 값을 확인해주세요"); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "CLOUD", description: form.description || null,
        vendor: form.vendor || null, cost: form.cost ? Number(form.cost) : null,
        currency: form.currency, billingCycle: form.billingCycle,
        purchaseDate: form.purchaseDate || null, expiryDate: form.expiryDate || null,
        cloudDetail: {
          platform: cloud.platform || null, accountId: cloud.accountId || null,
          region: cloud.region || null, seatCount: cloud.seatCount ? Number(cloud.seatCount) : null,
          serviceCategory: cloud.serviceCategory || null, resourceType: cloud.resourceType || null,
          resourceId: cloud.resourceId || null, instanceSpec: cloud.instanceSpec || null,
          storageSize: cloud.storageSize || null, endpoint: cloud.endpoint || null,
          vpcId: cloud.vpcId || null, availabilityZone: cloud.availabilityZone || null,
          contractStartDate: cloud.contractStartDate || null,
          contractTermMonths: cloud.contractTermMonths ? Number(cloud.contractTermMonths) : null,
          renewalDate: cloud.renewalDate || null,
          cancellationNoticeDate: cloud.cancellationNoticeDate || null,
          cancellationNoticeDays: cloud.cancellationNoticeDays ? Number(cloud.cancellationNoticeDays) : null,
          paymentMethod: cloud.paymentMethod || null,
          contractNumber: cloud.contractNumber || null,
          adminEmail: cloud.adminEmail || null,
          adminSlackId: cloud.adminSlackId || null,
          notifyChannels: cloud.notifyChannels || "EMAIL",
          autoRenew: cloud.autoRenew === "true" ? true : cloud.autoRenew === "false" ? false : null,
          notes: cloud.notes || null,
        },
      };
      const res = await fetch(`/api/assets/${assetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "수정 실패");
      toast.success("수정되었습니다");
      router.push(`/cloud/${assetId}`);
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
          <Link href={`/cloud/${assetId}`} className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">클라우드 자산 수정</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">기본 정보</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">자산명 <span className="text-red-500">*</span></label>
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
              <div><label className="block text-sm font-medium text-gray-700 mb-2">구매일</label><input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">만료일</label><input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={inputCls} /></div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">클라우드 상세 정보</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">플랫폼</label><select name="platform" value={cloud.platform} onChange={onCloudChange} className={inputCls}><option value="">선택</option>{PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">계정 ID</label><input type="text" name="accountId" value={cloud.accountId} onChange={onCloudChange} className={inputCls} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">리전</label><input type="text" name="region" value={cloud.region} onChange={onCloudChange} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">시트 수</label><input type="number" name="seatCount" value={cloud.seatCount} onChange={onCloudChange} min="0" className={inputCls} /></div>
            </div>
          </div>

          {/* 서비스 분류 */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">서비스 분류</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">서비스 카테고리</label>
                <select name="serviceCategory" value={cloud.serviceCategory} onChange={onCloudChange} className={inputCls}>
                  <option value="">선택</option>
                  {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">리소스 타입</label>
                <select name="resourceType" value={cloud.resourceType} onChange={onCloudChange} className={inputCls}>
                  <option value="">선택</option>
                  {(RESOURCE_TYPES[cloud.platform] || RESOURCE_TYPES._default).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">리소스 ID</label>
              <input type="text" name="resourceId" value={cloud.resourceId} onChange={onCloudChange} placeholder="i-0abc123, sg-xxx, arn:aws:..." className={`${inputCls} font-mono`} />
            </div>
          </div>

          {/* 인프라 상세 */}
          {(["IaaS", "Database", "Storage", "Security", "Network", ""].includes(cloud.serviceCategory) || ["AWS", "GCP", "Azure"].includes(cloud.platform)) && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">인프라 상세</h2>
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">인스턴스 사양</label><input type="text" name="instanceSpec" value={cloud.instanceSpec} onChange={onCloudChange} placeholder="t4g.small, db.r6g.large 등" className={`${inputCls} font-mono`} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">저장 용량</label><input type="text" name="storageSize" value={cloud.storageSize} onChange={onCloudChange} placeholder="100GB, 1TB 등" className={inputCls} /></div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">엔드포인트</label>
                <input type="text" name="endpoint" value={cloud.endpoint} onChange={onCloudChange} placeholder="접속 URL" className={`${inputCls} font-mono`} />
              </div>
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">VPC ID</label><input type="text" name="vpcId" value={cloud.vpcId} onChange={onCloudChange} className={`${inputCls} font-mono`} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">가용 영역</label><input type="text" name="availabilityZone" value={cloud.availabilityZone} onChange={onCloudChange} className={`${inputCls} font-mono`} /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">자동 갱신</label>
                  <select name="autoRenew" value={cloud.autoRenew} onChange={onCloudChange} className={inputCls}>
                    <option value="">미지정</option>
                    <option value="true">예</option>
                    <option value="false">아니오</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 계약/구독 관리 */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">계약 / 구독 관리</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">계약 시작일</label><input type="date" name="contractStartDate" value={cloud.contractStartDate} onChange={onCloudChange} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">계약 기간 (개월)</label><input type="number" name="contractTermMonths" value={cloud.contractTermMonths} onChange={onCloudChange} min="1" max="120" className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">갱신 예정일</label><input type="date" name="renewalDate" value={cloud.renewalDate} onChange={onCloudChange} className={inputCls} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">해지 통보 기한</label>
                <input type="date" name="cancellationNoticeDate" value={cloud.cancellationNoticeDate} onChange={onCloudChange} className={inputCls} />
                <p className="mt-1 text-xs text-gray-500">이 날짜까지 해지 의사를 통보해야 합니다</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">해지 통보 사전 일수</label>
                <input type="number" name="cancellationNoticeDays" value={cloud.cancellationNoticeDays} onChange={onCloudChange} min="1" max="365" className={inputCls} />
                <p className="mt-1 text-xs text-gray-500">갱신일 N일 전 통보 필요</p>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">결제 수단</label>
                <select name="paymentMethod" value={cloud.paymentMethod} onChange={onCloudChange} className={inputCls}>
                  <option value="">선택</option>
                  <option value="CARD">카드</option>
                  <option value="TRANSFER">계좌이체</option>
                  <option value="INVOICE">청구서</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">계약/구독 번호</label>
                <input type="text" name="contractNumber" value={cloud.contractNumber} onChange={onCloudChange} className={`${inputCls} font-mono`} />
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">알림 설정</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">알림 채널</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "EMAIL", label: "이메일만" },
                  { value: "SLACK", label: "Slack만" },
                  { value: "BOTH", label: "이메일 + Slack" },
                  { value: "NONE", label: "알림 끄기" },
                ].map((opt) => (
                  <label key={opt.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${cloud.notifyChannels === opt.value ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input type="radio" name="notifyChannels" value={opt.value} checked={cloud.notifyChannels === opt.value} onChange={onCloudChange} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">갱신일, 해지 통보 기한 등 주요 일정에 대한 알림 (D-70, D-30, D-15, D-7)</p>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {(cloud.notifyChannels === "EMAIL" || cloud.notifyChannels === "BOTH") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">관리자 이메일</label>
                  <input type="email" name="adminEmail" value={cloud.adminEmail} onChange={onCloudChange} className={inputCls} />
                  <p className="mt-1 text-xs text-gray-500">알림 수신 이메일 주소</p>
                </div>
              )}
              {(cloud.notifyChannels === "SLACK" || cloud.notifyChannels === "BOTH") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slack 멤버 ID</label>
                  <input type="text" name="adminSlackId" value={cloud.adminSlackId} onChange={onCloudChange} placeholder="U01AB23CD" className={`${inputCls} font-mono`} />
                  <p className="mt-1 text-xs text-gray-500">Slack DM으로 알림 발송</p>
                </div>
              )}
            </div>
          </div>

          {/* 관리 정보 */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">관리 정보</h2>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">비고</label><textarea name="notes" value={cloud.notes} onChange={(e) => setCloud((p) => ({ ...p, notes: e.target.value }))} rows={2} className={inputCls} /></div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isLoading ? "수정 중..." : "수정"}</button>
            <Link href={`/cloud/${assetId}`} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">취소</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
