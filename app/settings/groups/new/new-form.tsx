"use client";

import { useActionState, useState } from "react";
import { createGroup, type FormState } from "./actions";
import Link from "next/link";

type License = { id: number; name: string };

const initialState: FormState = {};

export default function NewGroupForm({ licenses }: { licenses: License[] }) {
  const [state, formAction, isPending] = useActionState(createGroup, initialState);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleLicense(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      {state.message && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{state.message}</div>
      )}

      <form action={formAction} className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
            기본 정보
          </legend>

          <Field label="그룹명" required error={state.errors?.name}>
            <input type="text" name="name" required className="input" placeholder="예: 기본 소프트웨어" />
          </Field>

          <Field label="설명">
            <textarea name="description" rows={2} className="input resize-y" placeholder="그룹에 대한 설명을 입력하세요." />
          </Field>

          <label className="flex items-center gap-2">
            <input type="checkbox" name="isDefault" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm font-medium text-gray-700">기본 그룹으로 설정 (신규 조직원에게 자동 배정)</span>
          </label>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
            라이선스 선택
          </legend>

          {licenses.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 라이선스가 없습니다.</p>
          ) : (
            <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {licenses.map((license) => (
                <label
                  key={license.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    selectedIds.has(license.id) ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="licenseIds"
                    value={license.id}
                    checked={selectedIds.has(license.id)}
                    onChange={() => toggleLicense(license.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {license.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
          <Link href="/settings/groups" className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
            취소
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "생성 중..." : "생성"}
          </button>
        </div>
      </form>
    </>
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
