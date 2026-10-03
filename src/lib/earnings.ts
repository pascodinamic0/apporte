/** Rider keeps 70% of the delivery fee. This is the only compensation rule in the app. */
export const RIDER_DELIVERY_SHARE = 0.7;

export function riderEarningsUsd(deliveryFeeUsd: number): number {
  return Math.round(deliveryFeeUsd * RIDER_DELIVERY_SHARE * 100) / 100;
}

export type EarningsWindow = "today" | "week" | "all";

/** Start of the current day in Kinshasa (UTC+1, no DST), as epoch ms. */
export function kinshasaStartOfDay(now = Date.now()): number {
  const k = new Date(now + 3_600_000);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 3_600_000;
}

export function earningsWindowStart(window: EarningsWindow, now = Date.now()): number {
  if (window === "all") return 0;
  const start = kinshasaStartOfDay(now);
  if (window === "today") return start;
  return start - 6 * 24 * 3_600_000;
}

export type EarningsOrder = {
  status: string;
  deliveryFeeUsd: number;
  updatedAt: number;
  riderPaidAt?: number;
};

export function summarizeRiderEarnings(orders: EarningsOrder[], window: EarningsWindow, now = Date.now()) {
  const start = earningsWindowStart(window, now);
  let earned = 0;
  let paid = 0;
  for (const o of orders) {
    if (o.status !== "delivered" || o.updatedAt < start) continue;
    const amount = riderEarningsUsd(o.deliveryFeeUsd);
    earned += amount;
    if (o.riderPaidAt) paid += amount;
  }
  earned = Math.round(earned * 100) / 100;
  paid = Math.round(paid * 100) / 100;
  return { earned, paid, pending: Math.round((earned - paid) * 100) / 100 };
}
