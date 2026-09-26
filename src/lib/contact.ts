import { normalizeDrcPhone } from "./phone";

/** Support e-mail (always available as a fallback). */
export const SUPPORT_EMAIL = "pascal@digni-digital-llc.com";

/**
 * WhatsApp support line (24/7), configured with NEXT_PUBLIC_SUPPORT_WHATSAPP
 * (e.g. "+243 81 234 5678"). Returns the wa.me digits, or null when unset or
 * invalid — the WhatsApp button is then hidden and the e-mail form is shown.
 * Congolese numbers (+243…) must be exactly 9 digits after the country code.
 */
export function parseWhatsappNumber(raw: string | undefined | null): string | null {
  if (!raw || !raw.trim()) return null;
  const digits = raw.replace(/[^\d]/g, "").replace(/^00/, "");
  if (digits.startsWith("243")) {
    const n = normalizeDrcPhone("+" + digits);
    return n ? n.slice(1) : null;
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export const SUPPORT_WHATSAPP = parseWhatsappNumber(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP);

export function whatsappLink(digits: string, text?: string): string {
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
