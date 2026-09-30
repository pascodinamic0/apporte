/** Fee model (pure, shared by server and client). Prices already include TVA. */
export type FeeSettings = {
  commissionPct: number; // restaurant commission on the food subtotal
  riderSharePct: number; // share of the delivery fee kept by the rider
  vatPct: number; // TVA, included in displayed prices
};

/** Defaults accepted by Pascal (seeded in app_settings). */
export const DEFAULT_FEES: FeeSettings = { commissionPct: 15, riderSharePct: 80, vatPct: 16 };

export type Zone = { id: string; name: string; deliveryFeeUsd: number; active: boolean; sortOrder: number };

export const DEFAULT_ZONES: Zone[] = [
  { id: "zone_gombe", name: "Gombe", deliveryFeeUsd: 2, active: true, sortOrder: 1 },
  { id: "zone_lingwala", name: "Lingwala", deliveryFeeUsd: 2.5, active: false, sortOrder: 2 },
  { id: "zone_barumbu", name: "Barumbu", deliveryFeeUsd: 2.5, active: false, sortOrder: 3 },
  { id: "zone_kinshasa", name: "Kinshasa", deliveryFeeUsd: 3, active: false, sortOrder: 4 },
  { id: "zone_kintambo", name: "Kintambo", deliveryFeeUsd: 3, active: false, sortOrder: 5 },
  { id: "zone_ngaliema", name: "Ngaliema", deliveryFeeUsd: 3.5, active: false, sortOrder: 6 },
  { id: "zone_limete", name: "Limete", deliveryFeeUsd: 4, active: false, sortOrder: 7 },
];

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type Breakdown = {
  subtotalUsd: number;
  deliveryFeeUsd: number;
  totalUsd: number;
  commissionUsd: number;
  restaurantPayoutUsd: number;
  riderEarningUsd: number;
  platformDeliveryUsd: number;
  vatUsd: number; // TVA included in the total
  totalExVatUsd: number;
};

export function computeBreakdown(
  subtotalUsd: number,
  deliveryFeeUsd: number,
  s: FeeSettings,
  commissionOverridePct?: number | null,
): Breakdown {
  const pct = commissionOverridePct ?? s.commissionPct;
  const subtotal = round2(subtotalUsd);
  const fee = round2(deliveryFeeUsd);
  const total = round2(subtotal + fee);
  const commission = round2((subtotal * pct) / 100);
  const rider = riderEarning(fee, s.riderSharePct);
  const vat = vatIncluded(total, s.vatPct);
  return {
    subtotalUsd: subtotal,
    deliveryFeeUsd: fee,
    totalUsd: total,
    commissionUsd: commission,
    restaurantPayoutUsd: round2(subtotal - commission),
    riderEarningUsd: rider,
    platformDeliveryUsd: round2(fee - rider),
    vatUsd: vat,
    totalExVatUsd: round2(total - vat),
  };
}

export function riderEarning(deliveryFeeUsd: number, riderSharePct: number): number {
  return round2((deliveryFeeUsd * riderSharePct) / 100);
}

/** TVA contained in a TVA-inclusive amount: amount × rate / (100 + rate). */
export function vatIncluded(amountUsd: number, vatPct: number): number {
  if (vatPct <= 0) return 0;
  return round2((amountUsd * vatPct) / (100 + vatPct));
}

export function zoneFee(zones: Zone[], zoneName: string): number | null {
  const z = zones.find((z) => z.name.toLowerCase() === zoneName.trim().toLowerCase());
  if (!z || !z.active) return null;
  return z.deliveryFeeUsd;
}

export function validateFeeSettings(input: unknown): { ok: true; data: FeeSettings } | { ok: false; reason: string } {
  if (!input || typeof input !== "object") return { ok: false, reason: "invalid_body" };
  const b = input as Record<string, unknown>;
  const out: Partial<FeeSettings> = {};
  for (const k of ["commissionPct", "riderSharePct", "vatPct"] as const) {
    const v = typeof b[k] === "string" ? Number(String(b[k]).replace(",", ".")) : b[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) return { ok: false, reason: `invalid_${k}` };
    out[k] = Math.round(v * 100) / 100;
  }
  return { ok: true, data: out as FeeSettings };
}

export function formatPct(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1).replace(".", ",")} %`;
}
