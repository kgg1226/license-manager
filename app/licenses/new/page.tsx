"use client";

import { useActionState, useState } from "react";
import { createLicense, type FormState } from "./actions";
import Link from "next/link";
import CostCalculatorSection from "@/app/licenses/_components/cost-calculator-section";
import {
  VALID_CURRENCIES,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  calcRenewalDate,
  type Currency,
  type PaymentCycle,
} from "@/lib/cost-calculator";

const initialState: FormState = {};

const NOTICE_OPTIONS = [
  { value: "", label: "설정 안 함" },
  { value: "30", label: "1개월 전 (30일)" },
  { value: "90", label: "3개월 전 (90일)" },
  { value: "custom", label: "직접 입력" },
] as const;

type LicenseType = "NO_KEY" | "KEY_BASED" | "VOLUME";

const LICENSE_TYPE_OPTIONS: { value: LicenseType; label: string; description: string }[] = [
  { value: "KEY_BASED", label: "개별 키", description: "인원별 고유 키 관리 (시트 기반)" },
  { value: "VOLUME", label: "볼륨 키", description: "하나의 키를 여러 명에게 공유" },
  { value: "NO_KEY", label: "키 없음", description: "계정 기반 · 서비스 구독 등 키 불필요" },
];

export default function NewLicensePage() {
  const [state, formAction, isPending] = useActionState(createLicense, initialState);
  const [licenseType, setLicenseType] = useState<LicenseType>("KEY_BASED");
  const [noticePeriodType, setNoticePeriodType] = useState("");
  const [quantityStr, setQuantityStr] = useState("");
  const [unitPriceStr, setUnitPriceStr] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>("YEARLY");
  const [purchaseDateStr, setPurchaseDateStr] = useState("");

  const qty = parseFloat(quantityStr);
  const quantity = isFinite(qty) && qty > 0 ? qty : null;
  const up = parseFloat(unitPriceStr);
  const unitPrice = isFinite(up) && up >= 0 ? up : null;

  // Auto-compute renewal date whenever purchase date or payment cycle changes
  const renewalDateStr = calcRenewalDate(purchaseDateStr, paymentCycle);

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

            <Field label="라이선스 유형" required error={state.errors?.licenseType}>
              <div className="flex flex-wrap gap-2">
                {LICENSE_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                      licenseType === opt.value
                        ? "bg-blue-600 text-white ring-blue-600"
                        : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="licenseType"
                      value={opt.value}
                      checked={licenseType === opt.value}
                      onChange={() => setLicenseType(opt.value)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {LICENSE_TYPE_OPTIONS.find((o) => o.value === licenseType)?.description}
              </p>
            </Field>

            {licenseType === "VOLUME" && (
              <Field label="볼륨 라이선스 키">
                <input
                  type="text"
                  name="key"
                  placeholder="예: XXXXX-XXXXX-XXXXX-XXXXX"
                  className="input"
                />
              </Field>
            )}

            {licenseType === "KEY_BASED" && (
              <p className="text-xs text-gray-500">
                개별 라이선스의 키는 등록 후 수정 화면의 시트 목록에서 관리합니다.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="수량" required error={state.errors?.totalQuantity}>
                <input
                  type="number"
                  name="totalQuantity"
                  min={1}
                  required
                  value={quantityStr}
                  onChange={(e) => setQuantityStr(e.target.value)}
                  placeholder="1"
                  className="input"
                />
              </Field>

              <Field label={`단가 (${CURRENCY_SYMBOLS[currency]})`} error={state.errors?.unitPrice}>
                <input
                  type="number"
                  name="unitPrice"
                  min={0}
                  step="any"
                  value={unitPriceStr}
                  onChange={(e) => setUnitPriceStr(e.target.value)}
                  placeholder="0"
                  className="input"
                />
              </Field>

              <Field label="통화">
                <select
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="input"
                >
                  {VALID_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="담당자명">
              <input
                type="text"
                name="adminName"
                placeholder="예: 홍길동"
                className="input"
              />
            </Field>
          </fieldset>

          {/* 비용 계산 */}
          <CostCalculatorSection
            paymentCycle={paymentCycle}
            onPaymentCycleChange={setPaymentCycle}
            quantity={quantity}
            unitPrice={unitPrice}
            currency={currency}
            errors={state.errors}
          />

          {/* 날짜 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              날짜 정보
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="구매일 (시작일)" required error={state.errors?.purchaseDate}>
                <input
                  type="date"
                  name="purchaseDate"
                  required
                  value={purchaseDateStr}
                  onChange={(e) => setPurchaseDateStr(e.target.value)}
                  className="input"
                />
              </Field>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  갱신일{" "}
                  <span className="text-xs font-normal text-gray-400">(자동 계산)</span>
                </label>
                <div className="input flex cursor-not-allowed items-center bg-gray-50 text-gray-500">
                  {renewalDateStr || "—"}
                </div>
                {/* Submit the computed renewal date as expiryDate */}
                <input type="hidden" name="expiryDate" value={renewalDateStr} />
                <p className="mt-1 text-xs text-gray-400">
                  구매일과 납부 주기에 따라 자동 계산됩니다.
                </p>
              </div>
            </div>
          </fieldset>

          {/* 해지 통보 기한 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              해지 통보 기한
            </legend>

            <p className="text-xs text-gray-500">
              갱신일로부터 며칠 전에 해지 통보가 필요한지 설정합니다.
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
