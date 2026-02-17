"use client";

import { useActionState, useState } from "react";
import { createLicense, type FormState } from "./actions";
import Link from "next/link";

const initialState: FormState = {};

const NOTICE_OPTIONS = [
  { value: "", label: "설정 안 함" },
  { value: "30", label: "1개월 전 (30일)" },
  { value: "90", label: "3개월 전 (90일)" },
  { value: "custom", label: "직접 입력" },
] as const;

export default function NewLicensePage() {
  const [state, formAction, isPending] = useActionState(createLicense, initialState);
  const [noticePeriodType, setNoticePeriodType] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">라이선스 등록</h1>
          <Link
            href="/licenses"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; 목록으로
          </Link>
        </div>

        {state.message && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {/* 기본 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              기본 정보
            </legend>

            <Field label="라이선스명" required error={state.errors?.name}>
              <input
                type="text"
                name="name"
                required
                placeholder="예: Microsoft 365 Business"
                className="input"
              />
            </Field>

            <Field label="라이선스 키">
              <input
                type="text"
                name="key"
                placeholder="예: XXXXX-XXXXX-XXXXX-XXXXX"
                className="input"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="수량" required error={state.errors?.totalQuantity}>
                <input
                  type="number"
                  name="totalQuantity"
                  min={1}
                  required
                  placeholder="1"
                  className="input"
                />
              </Field>

              <Field label="금액 (원)" error={state.errors?.price}>
                <input
                  type="number"
                  name="price"
                  min={0}
                  step="any"
                  placeholder="0"
                  className="input"
                />
              </Field>

              <Field label="담당자명">
                <input
                  type="text"
                  name="adminName"
                  placeholder="예: 홍길동"
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          {/* 날짜 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              날짜 정보
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="구매일" required error={state.errors?.purchaseDate}>
                <input
                  type="date"
                  name="purchaseDate"
                  required
                  className="input"
                />
              </Field>

              <Field label="만료일">
                <input
                  type="date"
                  name="expiryDate"
                  className="input"
                />
              </Field>

              <Field label="계약일">
                <input
                  type="date"
                  name="contractDate"
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          {/* 해지 통보 기한 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              해지 통보 기한
            </legend>

            <p className="text-xs text-gray-500">
              만료일로부터 며칠 전에 해지 통보가 필요한지 설정합니다.
            </p>

            <div className="flex flex-wrap gap-3">
              {NOTICE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                    noticePeriodType === opt.value
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="noticePeriodType"
                    value={opt.value}
                    checked={noticePeriodType === opt.value}
                    onChange={(e) => setNoticePeriodType(e.target.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {noticePeriodType === "custom" && (
              <Field label="통보 기한 (일)" error={state.errors?.noticePeriodCustom}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="noticePeriodCustom"
                    min={1}
                    placeholder="예: 60"
                    className="input max-w-32"
                  />
                  <span className="text-sm text-gray-500">일 전</span>
                </div>
              </Field>
            )}
          </fieldset>

          {/* 비고 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              비고
            </legend>

            <Field label="설명">
              <textarea
                name="description"
                rows={3}
                placeholder="라이선스에 대한 추가 메모를 입력하세요."
                className="input resize-y"
              />
            </Field>
          </fieldset>

          {/* 제출 */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Link
              href="/licenses"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            >
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

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
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
