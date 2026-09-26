/**
 * DRC phone numbers.
 * Mobile numbers are 9 digits after the +243 country code and start with 8 or 9
 * (Vodacom 81/82/83, Airtel 97/98/99, Orange 84/85/89/80, Africell 90/91).
 * Accepted input forms: "+243 81 234 5678", "00243812345678", "243812345678",
 * "0812345678", "812345678". Spaces, dots, dashes and parentheses are ignored.
 */
export function normalizeDrcPhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 32) return null;
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.indexOf("+") > 0) return null;
  digits = digits.replace(/^\+/, "");
  if (digits.startsWith("00243")) digits = digits.slice(5);
  else if (digits.startsWith("243")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[89]\d{8}$/.test(digits)) return null;
  return `+243${digits}`;
}

export function isValidDrcPhone(input: unknown): boolean {
  return normalizeDrcPhone(input) !== null;
}

/** "+243812345678" -> "+243 81 234 5678" */
export function formatDrcPhone(e164: string | undefined | null): string {
  if (!e164) return "";
  const n = normalizeDrcPhone(e164);
  if (!n) return e164;
  const d = n.slice(4);
  return `+243 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}
