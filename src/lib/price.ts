/** Merchant menu price: > 0, <= 1000 USD, at most 2 decimals. Accepts "7,5". */
export function parseMenuPrice(input: unknown): number | null {
  let n: number;
  if (typeof input === "number") n = input;
  else if (typeof input === "string") {
    const s = input.trim().replace(",", ".");
    if (!/^\d{1,4}(\.\d{1,2})?$/.test(s)) return null;
    n = Number(s);
  } else return null;
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return null;
  return Math.round(n * 100) / 100;
}

