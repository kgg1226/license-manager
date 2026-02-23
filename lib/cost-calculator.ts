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
