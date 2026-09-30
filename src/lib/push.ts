import webpush from "web-push";
import { getServiceClient } from "./supabase/server";

export type PushMessage = { title: string; body: string; url: string; tag?: string };

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

let vapidSet = false;
function ensureVapid() {
  if (vapidSet) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@apporte.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  vapidSet = true;
}

/** Send a web push to every subscription of these users. Best-effort, never throws. */
export async function pushToUsers(userIds: string[], msg: PushMessage): Promise<number> {
  if (!pushConfigured() || userIds.length === 0) return 0;
  try {
    ensureVapid();
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .in("user_id", Array.from(new Set(userIds)));
    if (error || !data?.length) return 0;
    const payload = JSON.stringify(msg);
    let sent = 0;
    await Promise.all(
      data.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 600, timeout: 4000, urgency: "high" },
          );
          sent++;
        } catch (e: any) {
          const code = e?.statusCode;
          if (code === 404 || code === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      }),
    );
    return sent;
  } catch (e) {
    console.warn("push failed", (e as Error)?.message);
    return 0;
  }
}

export { customerStatusText } from "./statusText";
