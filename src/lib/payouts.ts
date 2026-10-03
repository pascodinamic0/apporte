import { riderEarningsUsd } from "./earnings";
import { normalizeDrcPhone } from "./phone";
import type { MobileMoneyProvider } from "./types";

const PROVIDERS: Record<MobileMoneyProvider, string> = {
  mpesa: "M-Pesa (Vodacom)",
  airtel: "Airtel Money",
  orange: "Orange Money",
  africell: "Afrimoney",
  mobile: "Mobile Money",
};

export function mobileMoneyProvider(input: string): { provider: MobileMoneyProvider; label: string } | null {
  const n = normalizeDrcPhone(input);
  if (!n) return null;
  const prefix = n.slice(4, 6);
  let provider: MobileMoneyProvider = "mobile";
  if (prefix === "81" || prefix === "82" || prefix === "83") provider = "mpesa";
  else if (prefix === "97" || prefix === "98" || prefix === "99") provider = "airtel";
  else if (prefix === "80" || prefix === "84" || prefix === "85" || prefix === "89") provider = "orange";
  else if (prefix === "90" || prefix === "91") provider = "africell";
  return { provider, label: PROVIDERS[provider] };
}

export function payoutProviderLabel(provider: MobileMoneyProvider): string {
  return PROVIDERS[provider];
}

type PayoutOrder = {
  id: string;
  status: string;
  deliveryFeeUsd: number;
  riderPaidAt?: number;
  riderEarningUsd?: number;
};

function earningOf(order: PayoutOrder): number {
  return typeof order.riderEarningUsd === "number" ? order.riderEarningUsd : riderEarningsUsd(order.deliveryFeeUsd);
}

/** Delivered courses not yet paid and not already sitting in an open withdrawal. */
export function selectWithdrawable(orders: PayoutOrder[], lockedOrderIds: Iterable<string>) {
  const locked = lockedOrderIds instanceof Set ? lockedOrderIds : new Set(lockedOrderIds);
  const orderIds: string[] = [];
  let amountUsd = 0;
  for (const o of orders) {
    if (o.status !== "delivered" || o.riderPaidAt || locked.has(o.id)) continue;
    orderIds.push(o.id);
    amountUsd += earningOf(o);
  }
  return { orderIds, amountUsd: Math.round(amountUsd * 100) / 100 };
}

export function lockedPayoutOrderIds(payouts: { status: string; orderIds: string[] }[]): Set<string> {
  const ids = new Set<string>();
  for (const p of payouts) {
    if (p.status !== "requested") continue;
    for (const id of p.orderIds) ids.add(id);
  }
  return ids;
}
