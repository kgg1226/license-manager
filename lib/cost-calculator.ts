export type PaymentCycle = "MONTHLY" | "YEARLY";
export type Currency = "KRW" | "USD" | "EUR" | "JPY" | "GBP" | "CNY";

export type CostInputs = {
  paymentCycle: PaymentCycle;
  quantity: number;
  unitPrice: number;
  currency: Currency;
  exchangeRate: number;
  isVatIncluded: boolean;
};

export type CostResult = {
  subtotal: number;
  vatAmount: number;
  totalAmountForeign: number;
  totalAmountKRW: number;
  annualKRW: number;
  monthlyKRW: number;
};

export function computeCost(inputs: CostInputs): CostResult {
  const { paymentCycle, quantity, unitPrice, exchangeRate, isVatIncluded } = inputs;
  const subtotal = unitPrice * quantity;
  const vatAmount = isVatIncluded ? 0 : Math.floor(subtotal * 0.1);
  const totalAmountForeign = Math.floor(subtotal + vatAmount);
  const rate = exchangeRate > 0 ? exchangeRate : 1;
  const totalAmountKRW = Math.floor(totalAmountForeign * rate);
  const annualKRW = paymentCycle === "YEARLY" ? totalAmountKRW : totalAmountKRW * 12;
  const monthlyKRW =
    paymentCycle === "MONTHLY" ? totalAmountKRW : Math.floor(totalAmountKRW / 12);

  return { subtotal, vatAmount, totalAmountForeign, totalAmountKRW, annualKRW, monthlyKRW };
}

export const VALID_PAYMENT_CYCLES = ["MONTHLY", "YEARLY"] as const;
export const VALID_CURRENCIES = ["KRW", "USD", "EUR", "JPY", "GBP", "CNY"] as const;

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KRW: "₩",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
  CNY: "¥",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  KRW: "KRW (원)",
  USD: "USD (달러)",
  EUR: "EUR (유로)",
  JPY: "JPY (엔)",
  GBP: "GBP (파운드)",
  CNY: "CNY (위안)",
};

export const PAYMENT_CYCLE_LABELS: Record<PaymentCycle, string> = {
  MONTHLY: "월 납부",
  YEARLY: "연 납부",
};

/**
 * Auto-calculate the next renewal date from a purchase date string (YYYY-MM-DD)
 * and a payment cycle. Handles end-of-month clamping (e.g. Jan 31 + 1 month = Feb 28/29).
 * Returns "" if input is invalid.
 */
export function calcRenewalDate(
  purchaseDateStr: string,
  paymentCycle: PaymentCycle
): string {
  if (!purchaseDateStr) return "";
  // Parse as local time — avoids UTC-offset day shifts
  const d = new Date(purchaseDateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";

  const origDay = d.getDate();
  if (paymentCycle === "MONTHLY") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  // If JS rolled the day over (e.g. Jan 31 → Mar 2), clamp to the last day
  // of the intended month by rewinding to day 0 of the next month.
  if (d.getDate() !== origDay) d.setDate(0);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
