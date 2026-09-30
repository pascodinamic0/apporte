/** Opening hours in Kinshasa time (UTC+1, no daylight saving). Pure helpers. */
export type DayHours = { open: string; close: string; closed: boolean };
/** 7 entries, index 0 = Sunday (like Date#getDay). */
export type WeekHours = DayHours[];

export const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const KINSHASA_OFFSET_MIN = 60;

export const DEFAULT_HOURS: WeekHours = [
  { open: "10:00", close: "23:00", closed: false },
  { open: "09:00", close: "23:00", closed: false },
  { open: "09:00", close: "23:00", closed: false },
  { open: "09:00", close: "23:00", closed: false },
  { open: "09:00", close: "23:00", closed: false },
  { open: "09:00", close: "00:30", closed: false },
  { open: "10:00", close: "00:30", closed: false },
];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function toMinutes(hhmm: string): number {
  const m = HHMM.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Day of week and minutes since midnight in Kinshasa. */
export function kinshasaClock(date: Date): { day: number; minutes: number } {
  const shifted = new Date(date.getTime() + KINSHASA_OFFSET_MIN * 60_000);
  return { day: shifted.getUTCDay(), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

export function normalizeHours(raw: unknown): WeekHours {
  if (!Array.isArray(raw) || raw.length !== 7) return DEFAULT_HOURS;
  return raw.map((d, i) => {
    const o = (d ?? {}) as Partial<DayHours>;
    const open = typeof o.open === "string" && HHMM.test(o.open) ? o.open : DEFAULT_HOURS[i].open;
    const close = typeof o.close === "string" && HHMM.test(o.close) ? o.close : DEFAULT_HOURS[i].close;
    return { open, close, closed: !!o.closed };
  });
}

export function validateHours(raw: unknown): { ok: true; data: WeekHours } | { ok: false; reason: string } {
  if (!Array.isArray(raw) || raw.length !== 7) return { ok: false, reason: "invalid_hours" };
  for (const d of raw) {
    if (!d || typeof d !== "object") return { ok: false, reason: "invalid_hours" };
    const o = d as Record<string, unknown>;
    if (typeof o.open !== "string" || !HHMM.test(o.open)) return { ok: false, reason: "invalid_time" };
    if (typeof o.close !== "string" || !HHMM.test(o.close)) return { ok: false, reason: "invalid_time" };
    if (!o.closed && o.open === o.close) return { ok: false, reason: "empty_range" };
  }
  return { ok: true, data: normalizeHours(raw) };
}

/** Open at `date`? A close time earlier than the open time runs past midnight. */
export function isOpenAt(hours: WeekHours, date: Date): boolean {
  const { day, minutes } = kinshasaClock(date);
  const today = hours[day];
  const yesterday = hours[(day + 6) % 7];
  if (today && !today.closed) {
    const o = toMinutes(today.open);
    const c = toMinutes(today.close);
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return true;
  }
  // Tail of yesterday's range that runs past midnight
  if (yesterday && !yesterday.closed) {
    const o = toMinutes(yesterday.open);
    const c = toMinutes(yesterday.close);
    if (c <= o && minutes < c) return true;
  }
  return false;
}

/** "aujourd’hui à 09:00", "demain à 10:00" or "lundi à 09:00" for the next opening. */
export function nextOpeningLabel(hours: WeekHours, date: Date): string | null {
  const { day, minutes } = kinshasaClock(date);
  for (let offset = 0; offset < 8; offset++) {
    const d = (day + offset) % 7;
    const h = hours[d];
    if (!h || h.closed) continue;
    const o = toMinutes(h.open);
    if (offset === 0 && o <= minutes) continue;
    const when = offset === 0 ? "aujourd’hui" : offset === 1 ? "demain" : DAY_NAMES[d].toLowerCase();
    return `${when} à ${h.open.replace(":", "h")}`;
  }
  return null;
}

export type Availability = {
  open: boolean;
  reason: "open" | "paused" | "outside_hours" | "suspended";
  label: string; // short French label for badges
  detail?: string; // e.g. "Ouvre demain à 9h00"
};

export function restaurantAvailability(
  r: { acceptingOrders?: boolean; suspended?: boolean; hours?: WeekHours },
  date: Date = new Date(),
): Availability {
  if (r.suspended) return { open: false, reason: "suspended", label: "Indisponible" };
  const hours = r.hours ?? DEFAULT_HOURS;
  if (!isOpenAt(hours, date)) {
    const next = nextOpeningLabel(hours, date);
    return { open: false, reason: "outside_hours", label: "Fermé", detail: next ? `Ouvre ${next}` : undefined };
  }
  if (r.acceptingOrders === false) {
    return { open: false, reason: "paused", label: "En pause", detail: "Ne prend pas de commandes pour le moment" };
  }
  return { open: true, reason: "open", label: "Ouvert" };
}

export function formatHoursRange(d: DayHours): string {
  if (d.closed) return "Fermé";
  return `${d.open.replace(":", "h")} – ${d.close.replace(":", "h")}`;
}
