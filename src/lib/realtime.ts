/**
 * Realtime "notify then fetch": the server broadcasts tiny events (no personal
 * data) on Supabase Realtime Broadcast channels; clients subscribed with the
 * public anon key refetch through the authenticated API. Polling remains as a
 * fallback on every screen.
 *
 * Channels: order:<id>, restaurant:<id>, customer:<userId>, rider:<riderId>, riders, admin
 */
export type RealtimeEvent = {
  type: "order_created" | "order_updated" | "offer" | "menu_updated" | "restaurant_updated" | "settings_updated";
  orderId?: string;
  status?: string;
  at: number;
};

export const CHANNEL_PREFIX = "apporte:";

export function channelName(topic: string): string {
  return CHANNEL_PREFIX + topic;
}

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Fire the broadcast; never throws (realtime is best-effort, polling covers gaps). */
export async function broadcast(topics: string[], event: Omit<RealtimeEvent, "at">): Promise<boolean> {
  if (!configured() || topics.length === 0) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + "/realtime/v1/api/broadcast";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const payload: RealtimeEvent = { ...event, at: Date.now() };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: Array.from(new Set(topics)).map((t) => ({ topic: channelName(t), event: event.type, payload, private: false })),
      }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch (e) {
    console.warn("realtime broadcast failed", (e as Error)?.message);
    return false;
  }
}
