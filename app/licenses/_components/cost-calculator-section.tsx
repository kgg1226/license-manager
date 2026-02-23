"use client";

import { useState, useMemo } from "react";
import {
  computeCost,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  PAYMENT_CYCLE_LABELS,
  VALID_CURRENCIES,
  VALID_PAYMENT_CYCLES,
  type PaymentCycle,
  type Currency,
} from "@/lib/cost-calculator";

type InitialValues = {
  paymentCycle: PaymentCycle | null;
  quantity: number | null;
  unitPrice: number | null;
  currency: Currency;
  exchangeRate: number;
  isVatIncluded: boolean;
};

export default function CostCalculatorSection({
  initialValues,
  errors,
}: {
  initialValues?: InitialValues;
  errors?: Record<string, string>;
}) {
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>(
    initialValues?.paymentCycle ?? "YEARLY"
  );
  const [quantityStr, setQuantityStr] = useState(
    initialValues?.quantity?.toString() ?? ""
  );
  const [unitPriceStr, setUnitPriceStr] = useState(
    initialValues?.unitPrice?.toString() ?? ""
  );
  const [currency, setCurrency] = useState<Currency>(
    initialValues?.currency ?? "KRW"
  );
  const [exchangeRateStr, setExchangeRateStr] = useState(
    (initialValues?.exchangeRate ?? 1).toString()
  );
  const [isVatIncluded, setIsVatIncluded] = useState(
    initialValues?.isVatIncluded ?? false
  );

  const preview = useMemo(() => {
    const qty = parseFloat(quantityStr);
    const price = parseFloat(unitPriceStr);
    const rate = parseFloat(exchangeRateStr);
    if (!isFinite(qty) || qty <= 0 || !isFinite(price) || price < 0) return null;
    return computeCost({
      paymentCycle,
      quantity: qty,
      unitPrice: price,
      currency,
      exchangeRate: isFinite(rate) && rate > 0 ? rate : 1,
      isVatIncluded,
    });
  }, [paymentCycle, quantityStr, unitPriceStr, currency, exchangeRateStr, isVatIncluded]);

  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <fieldset className="space-y-4">
      <legend className="w-full border-b border-gray-200 pb-2 text-base font-semibold text-gray-900">
        비용 계산{" "}
        <span className="text-xs font-normal text-gray-400">(선택)</span>
      </legend>

      {/* Hidden inputs — always submitted with the form */}
      <input type="hidden" name="paymentCycle" value={paymentCycle} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="isVatIncluded" value={isVatIncluded ? "true" : "false"} />

      {/* Payment cycle */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          납부 주기
        </label>
        <div className="flex gap-2">
          {VALID_PAYMENT_CYCLES.map((cycle) => (
            <label
              key={cycle}
              className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                paymentCycle === cycle
                  ? "bg-blue-600 text-white ring-blue-600"
                  : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                value={cycle}
                checked={paymentCycle === cycle}
                onChange={() => setPaymentCycle(cycle)}
                className="sr-only"
              />
              {PAYMENT_CYCLE_LABELS[cycle]}
            </label>
          ))}
        </div>
      </div>

      {/* Quantity + Currency */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            결제 수량
          </label>
          <input
            type="number"
            name="quantity"
            min={1}
            step={1}
            value={quantityStr}
            onChange={(e) => setQuantityStr(e.target.value)}
            placeholder="예: 10"
            className="input"
          />
          {errors?.quantity && (
            <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            통화
          </label>
          <select
            value={currency}
            onChange={(e) => {
              const c = e.target.value as Currency;
              setCurrency(c);
              if (c === "KRW") setExchangeRateStr("1");
            }}
            className="input"
          >
            {VALID_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Unit price + Exchange rate */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            단가 ({symbol})
          </label>
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
          {errors?.unitPrice && (
            <p className="mt-1 text-xs text-red-600">{errors.unitPrice}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            환율 ({symbol} → ₩)
          </label>
          <input
            type="number"
            name="exchangeRate"
            min={0.000001}
            step="any"
            value={exchangeRateStr}
            onChange={(e) => setExchangeRateStr(e.target.value)}
            disabled={currency === "KRW"}
            placeholder="1"
            className="input disabled:bg-gray-100 disabled:text-gray-400"
          />
          {currency === "KRW" ? (
            <p className="mt-1 text-xs text-gray-400">KRW는 환율 변환 불필요</p>
          ) : (
            errors?.exchangeRate && (
              <p className="mt-1 text-xs text-red-600">{errors.exchangeRate}</p>
            )
          )}
        </div>
      </div>

      {/* VAT toggle */}
      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isVatIncluded}
            onChange={(e) => setIsVatIncluded(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            단가에 VAT (10%) 포함됨
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          체크 해제 시 단가에 10% 부가세가 자동으로 추가됩니다.
        </p>
      </div>

      {/* Live preview */}
      {preview && (
        <div className="rounded-md bg-blue-50 p-4 ring-1 ring-blue-200">
          <h4 className="mb-3 text-sm font-semibold text-blue-900">
            계산 결과 미리보기
          </h4>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-gray-600">
              공급가액 ({symbol})
            </dt>
            <dd className="text-right font-medium text-gray-900">
              {preview.subtotal.toLocaleString("ko-KR")}
            </dd>

            {isVatIncluded ? (
              <>
                <dt className="text-gray-600">VAT</dt>
                <dd className="text-right text-gray-500">포함</dd>
              </>
            ) : (
              <>
                <dt className="text-gray-600">VAT 10% ({symbol})</dt>
                <dd className="text-right font-medium text-gray-900">
                  + {preview.vatAmount.toLocaleString("ko-KR")}
                </dd>
              </>
            )}

            <dt className="font-medium text-gray-700">
              합계 ({symbol})
            </dt>
            <dd className="text-right font-semibold text-blue-700">
              {preview.totalAmountForeign.toLocaleString("ko-KR")}
            </dd>

            {currency !== "KRW" && (
              <>
                <dt className="font-medium text-gray-700">합계 (₩)</dt>
                <dd className="text-right font-semibold text-blue-700">
                  ₩{preview.totalAmountKRW.toLocaleString("ko-KR")}
                </dd>
              </>
            )}

            <dt className="col-span-2 mt-1 border-t border-blue-200 pt-2 text-xs font-medium uppercase text-gray-500">
              환산
            </dt>
            <dt className="text-gray-600">월 환산 (₩)</dt>
            <dd className="text-right text-gray-700">
              ₩{preview.monthlyKRW.toLocaleString("ko-KR")}
            </dd>
            <dt className="text-gray-600">연 환산 (₩)</dt>
            <dd className="text-right text-gray-700">
              ₩{preview.annualKRW.toLocaleString("ko-KR")}
            </dd>
          </dl>
        </div>
      )}
    </fieldset>
  );
}
