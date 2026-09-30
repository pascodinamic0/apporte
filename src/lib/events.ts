import { broadcast } from "./realtime";
import { customerStatusText, pushConfigured, pushToUsers } from "./push";
import { getServiceClient } from "./supabase/server";

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Tell every interested screen that an order changed (realtime broadcast), and
 * send web pushes: new order → merchant, offer → online riders, status → customer.
 * Best-effort: failures are logged, never thrown.
 */
export async function emitOrderEvent(
  orderId: string,
  opts: { created?: boolean; previousRiderId?: string | null } = {},
): Promise<void> {
  if (!configured()) return;
  try {
    const supabase = getServiceClient();
    const { data: o } = await supabase
      .from("orders")
      .select("id,status,restaurant_id,customer_id,rider_id,total_usd")
      .eq("id", orderId)
      .maybeSingle();
    if (!o) return;
    const topics = [`order:${o.id}`, "admin", `customer:${o.customer_id}`];
    if (o.restaurant_id) topics.push(`restaurant:${o.restaurant_id}`);
    if (o.rider_id) topics.push(`rider:${o.rider_id}`);
    if (opts.previousRiderId && opts.previousRiderId !== o.rider_id) topics.push(`rider:${opts.previousRiderId}`);
    // Riders refetch offers whenever the searching pool changes
    topics.push("riders");
    const work: Promise<unknown>[] = [
      broadcast(topics, { type: opts.created ? "order_created" : "order_updated", orderId: o.id, status: o.status }),
    ];
    if (pushConfigured()) work.push(pushForOrder(o, !!opts.created));
    await Promise.race([Promise.all(work), new Promise((r) => setTimeout(r, 4500))]);
  } catch (e) {
    console.warn("emitOrderEvent failed", (e as Error)?.message);
  }
}

async function pushForOrder(
  o: { id: string; status: string; restaurant_id: string | null; customer_id: string; total_usd: number },
  created: boolean,
) {
  const supabase = getServiceClient();
  const jobs: Promise<unknown>[] = [];
  const total = Number(o.total_usd).toFixed(2);
  if (created && o.restaurant_id && o.status === "placed") {
    const { data } = await supabase.from("users").select("id").eq("merchant_id", o.restaurant_id);
    jobs.push(
      pushToUsers((data || []).map((u: { id: string }) => u.id), {
        title: "Nouvelle commande",
        body: `Commande #${o.id.slice(-6).toUpperCase()} · $${total}. Touchez pour l’accepter.`,
        url: "/merchant",
        tag: `order-${o.id}`,
      }),
    );
  }
  if (o.status === "rider_searching") {
    const { data: riders } = await supabase.from("riders").select("id").eq("status", "online").eq("suspended", false);
    const ids = (riders || []).map((r: { id: string }) => r.id);
    if (ids.length) {
      const { data } = await supabase.from("users").select("id").in("rider_id", ids);
      jobs.push(
        pushToUsers((data || []).map((u: { id: string }) => u.id), {
          title: "Nouvelle course disponible",
          body: "Une commande attend un livreur près de toi.",
          url: "/rider",
          tag: `offer-${o.id}`,
        }),
      );
    }
  }
  if (!created) {
    const text = customerStatusText(o.status);
    if (text) {
      jobs.push(
        pushToUsers([o.customer_id], { title: "Apporte", body: text, url: `/order/${o.id}`, tag: `status-${o.id}` }),
      );
    }
  }
  await Promise.all(jobs);
}

export async function emitTopic(topic: string, type: "menu_updated" | "restaurant_updated" | "settings_updated") {
  await broadcast([topic, "admin"], { type });
}
