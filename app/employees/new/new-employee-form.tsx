// 신규: 조직 계층(회사/조직/하위조직) 드롭다운 연동 포함 조직원 등록 폼 클라이언트 컴포넌트

"use client";

import { useActionState, useState, useEffect } from "react";
import { createEmployee, type FormState } from "./actions";
import Link from "next/link";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

const initialState: FormState = {};

export default function NewEmployeeForm({ companies }: { companies: Company[] }) {
  const [state, formAction, isPending] = useActionState(createEmployee, initialState);

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | "">("");
  const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");
  const [selectedSubOrgId, setSelectedSubOrgId] = useState<number | "">("");

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  // parentId=null인 최상위 조직만 표시
  const topOrgs = selectedCompany?.orgs.filter((o) => o.parentId === null) ?? [];
  // 선택한 org의 하위 조직
  const subOrgs = selectedCompany?.orgs.filter((o) => o.parentId === selectedOrgId) ?? [];

  // company 변경 시 org/subOrg 초기화
  function handleCompanyChange(val: string) {
    setSelectedCompanyId(val ? Number(val) : "");
    setSelectedOrgId("");
    setSelectedSubOrgId("");
  }

  // org 변경 시 subOrg 초기화
  function handleOrgChange(val: string) {
    setSelectedOrgId(val ? Number(val) : "");
    setSelectedSubOrgId("");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">조직원 등록</h1>
          <Link href="/employees" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; 목록으로
          </Link>
        </div>

        {state.message && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{state.message}</div>
        )}

        <form action={formAction} className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              기본 정보
            </legend>

            <Field label="이름" required error={state.errors?.name}>
              <input type="text" name="name" required className="input" placeholder="예: 홍길동" />
            </Field>

            <Field label="부서" required error={state.errors?.department}>
              <input type="text" name="department" required className="input" placeholder="예: 개발팀" />
            </Field>

            <Field label="이메일" error={state.errors?.email}>
              <input type="email" name="email" className="input" placeholder="예: hong@company.com" />
            </Field>

            <Field label="직함" error={state.errors?.title}>
              <input type="text" name="title" className="input" placeholder="예: 선임연구원" />
            </Field>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              조직 정보 (선택)
            </legend>

            <Field label="회사">
              <select
                name="companyId"
                value={selectedCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="input"
              >
                <option value="">선택 안 함</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="조직">
              <select
                name="orgId"
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="input"
                disabled={!selectedCompanyId || topOrgs.length === 0}
              >
                <option value="">선택 안 함</option>
                {topOrgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>

            <Field label="하위조직">
              <select
                name="subOrgId"
                value={selectedSubOrgId}
                onChange={(e) => setSelectedSubOrgId(e.target.value ? Number(e.target.value) : "")}
                className="input"
                disabled={!selectedOrgId || subOrgs.length === 0}
              >
                <option value="">선택 안 함</option>
                {subOrgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
          </fieldset>

          <p className="text-xs text-gray-500">
            기본 그룹에 포함된 라이선스가 자동으로 할당됩니다.
          </p>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Link href="/employees" className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
              취소
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
