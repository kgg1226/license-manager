// [2026-03-04] orgId/subOrgId → orgUnitId 단일 필드로 통합

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

export default function OrgEditForm({
  employeeId,
  initialTitle,
  initialCompanyId,
  initialOrgUnitId,
  companies,
}: {
  employeeId: number;
  initialTitle: string | null;
  initialCompanyId: number | null;
  initialOrgUnitId: number | null;
  companies: Company[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [title, setTitle] = useState(initialTitle ?? "");
  const [companyId, setCompanyId] = useState<number | "">(initialCompanyId ?? "");
  const [orgUnitId, setOrgUnitId] = useState<number | "">(initialOrgUnitId ?? "");

  const selectedCompany = companies.find((c) => c.id === companyId);
  const orgUnits = selectedCompany?.orgs ?? [];

  function handleCompanyChange(val: string) {
    setCompanyId(val ? Number(val) : "");
    setOrgUnitId("");
  }

  async function handleSave() {
    setIsPending(true);
    try {
      await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          companyId: companyId || null,
          orgUnitId: orgUnitId || null,
        }),
      });
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  function handleCancel() {
    setTitle(initialTitle ?? "");
    setCompanyId(initialCompanyId ?? "");
    setOrgUnitId(initialOrgUnitId ?? "");
    setIsEditing(false);
  }

  const initialCompany = companies.find((c) => c.id === initialCompanyId);
  const initialOrgUnit = initialCompany?.orgs.find((o) => o.id === initialOrgUnitId);

  if (!isEditing) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">조직 정보</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            수정
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">직함</dt>
            <dd className="mt-1 text-sm text-gray-900">{initialTitle ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">회사</dt>
            <dd className="mt-1 text-sm text-gray-900">{initialCompany?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">소속 조직</dt>
            <dd className="mt-1 text-sm text-gray-900">{initialOrgUnit?.name ?? "—"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">조직 정보 수정</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">직함</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input text-sm"
            placeholder="예: 선임연구원"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">회사</label>
          <select
            value={companyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="input text-sm"
          >
            <option value="">선택 안 함</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">소속 조직</label>
          <select
            value={orgUnitId}
            onChange={(e) => setOrgUnitId(e.target.value ? Number(e.target.value) : "")}
            className="input text-sm"
            disabled={!companyId || orgUnits.length === 0}
          >
            <option value="">선택 안 함</option>
            {orgUnits.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={handleCancel}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
        >
          취소
        </button>
      </div>
    </div>
  );
}
