/**
 * Milestone 2 operations (menu editing, restaurant settings, admin console,
 * saved addresses, push subscriptions, rider earnings). Supabase-backed; the
 * in-memory demo mode only supports what the M1 flows need.
 */
import type { MenuItem, Order, OrderStatus, Restaurant, Rider } from "../types";
import type { WeekHours } from "../hours";
import { randomId } from "../utils";
import { getServiceClient } from "../supabase/server";
import {
  buildOfferQueueForOrder,
  getOrder,
  hydrateOrderImages,
  mapMenuItem,
  mapOrderWithRelations,
  mapRestaurant,
  mapRider,
  supabaseConfigured,
} from "./db";
import * as memory from "./memory";
import { emitOrderEvent, emitTopic } from "../events";

function requireDb() {
  if (!supabaseConfigured()) throw new Error("supabase_required");
  return getServiceClient();
}

// ---------- Menu ----------
export const MENU_CATEGORIES = ["Entrées", "Plats", "Grillades", "Accompagnements", "Desserts", "Boissons"] as const;

export async function listMenuForMerchant(restaurantId: string): Promise<MenuItem[]> {
  if (!supabaseConfigured()) return memory.getMenuForRestaurant(restaurantId);
  const { data, error } = await getServiceClient()
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("archived", false)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data || []).map(mapMenuItem);
}

export type MenuItemInput = {
  name: string;
  description?: string | null;
  priceUsd: number;
  category: string;
  available: boolean;
  imageUrl?: string | null;
};

export async function createMenuItem(restaurantId: string, input: MenuItemInput): Promise<MenuItem> {
  const supabase = requireDb();
  const row = {
    id: randomId("mi"),
    restaurant_id: restaurantId,
    name: input.name,
    description: input.description || null,
    price_usd: input.priceUsd,
    category: input.category,
    cuisine_tag: input.category,
    available: input.available,
    image_url: input.imageUrl || null,
    archived: false,
  };
  const { data, error } = await supabase.from("menu_items").insert(row).select("*").single();
  if (error) throw error;
  await emitTopic(`restaurant:${restaurantId}`, "menu_updated");
  return mapMenuItem(data);
}

export async function getMenuItemRow(id: string): Promise<{ id: string; restaurant_id: string; archived: boolean } | null> {
  if (!supabaseConfigured()) {
    const all = memory.getRestaurants().flatMap((r) => memory.getMenuForRestaurant(r.id));
    const m = all.find((x) => x.id === id);
    return m ? { id: m.id, restaurant_id: m.restaurantId, archived: false } : null;
  }
  const { data, error } = await getServiceClient().from("menu_items").select("id,restaurant_id,archived").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMenuItem(id: string, patch: Partial<MenuItemInput>): Promise<MenuItem> {
  const supabase = requireDb();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description || null;
  if (patch.priceUsd !== undefined) row.price_usd = patch.priceUsd;
  if (patch.category !== undefined) {
    row.category = patch.category;
    row.cuisine_tag = patch.category;
  }
  if (patch.available !== undefined) row.available = patch.available;
  if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl || null;
  const { data, error } = await supabase.from("menu_items").update(row).eq("id", id).select("*").single();
  if (error) throw error;
  await emitTopic(`restaurant:${data.restaurant_id}`, "menu_updated");
  return mapMenuItem(data);
}

/** Soft delete: past orders keep pointing at the dish. */
export async function archiveMenuItem(id: string): Promise<void> {
  const supabase = requireDb();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ archived: true, available: false })
    .eq("id", id)
    .select("restaurant_id")
    .single();
  if (error) throw error;
  await emitTopic(`restaurant:${data.restaurant_id}`, "menu_updated");
}

// ---------- Restaurants ----------
export async function listRestaurantsAdmin(): Promise<Restaurant[]> {
  if (!supabaseConfigured()) return memory.getRestaurants();
  const { data, error } = await getServiceClient().from("restaurants").select("*").order("name");
  if (error) throw error;
  return (data || []).map(mapRestaurant);
}

export async function updateRestaurantOpenState(
  restaurantId: string,
  patch: { acceptingOrders?: boolean; hours?: WeekHours },
): Promise<Restaurant> {
  const supabase = requireDb();
  const row: Record<string, unknown> = {};
  if (patch.acceptingOrders !== undefined) row.accepting_orders = patch.acceptingOrders;
  if (patch.hours !== undefined) row.hours = patch.hours;
  const { data, error } = await supabase.from("restaurants").update(row).eq("id", restaurantId).select("*").single();
  if (error) throw error;
  await emitTopic(`restaurant:${restaurantId}`, "restaurant_updated");
  return mapRestaurant(data);
}

export type RestaurantInput = {
  name: string;
  description?: string | null;
  cuisine: string;
  zone: string;
  etaMinutes: number;
  imageUrl?: string | null;
  latitude: number;
  longitude: number;
  commissionPct?: number | null;
  phone?: string | null;
  hours?: WeekHours;
};

function restaurantRow(input: Partial<RestaurantInput>) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description || null;
  if (input.cuisine !== undefined) row.cuisine = input.cuisine;
  if (input.zone !== undefined) row.zone = input.zone;
  if (input.etaMinutes !== undefined) row.eta_minutes = input.etaMinutes;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl || null;
  if (input.latitude !== undefined) row.latitude = input.latitude;
  if (input.longitude !== undefined) row.longitude = input.longitude;
  if (input.commissionPct !== undefined) row.commission_pct = input.commissionPct;
  if (input.phone !== undefined) row.phone = input.phone || null;
  if (input.hours !== undefined) row.hours = input.hours;
  return row;
}

export async function createRestaurant(input: RestaurantInput): Promise<Restaurant> {
  const supabase = requireDb();
  const slug = input.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
  const row = {
    id: `rest_${slug || "new"}_${Math.random().toString(36).slice(2, 6)}`,
    rating: 4.5,
    is_open: true,
    accepting_orders: true,
    suspended: false,
    ...restaurantRow(input),
  };
  const { data, error } = await supabase.from("restaurants").insert(row).select("*").single();
  if (error) throw error;
  await emitTopic("restaurants", "restaurant_updated");
  return mapRestaurant(data);
}

export async function updateRestaurant(id: string, input: Partial<RestaurantInput> & { suspended?: boolean }): Promise<Restaurant> {
  const supabase = requireDb();
  const row = restaurantRow(input);
  if (input.suspended !== undefined) row.suspended = input.suspended;
  const { data, error } = await supabase.from("restaurants").update(row).eq("id", id).select("*").single();
  if (error) throw error;
  await emitTopic(`restaurant:${id}`, "restaurant_updated");
  return mapRestaurant(data);
}

// ---------- Riders ----------
export async function createRider(input: { name: string; phone?: string | null; latitude?: number; longitude?: number }): Promise<Rider> {
  const supabase = requireDb();
  const row = {
    id: randomId("rider"),
    name: input.name,
    phone: input.phone || null,
    status: "offline",
    reliability_percent: 90,
    latitude: input.latitude ?? -4.3125,
    longitude: input.longitude ?? 15.31,
    earnings_today_usd: 0,
    suspended: false,
  };
  const { data, error } = await supabase.from("riders").insert(row).select("*").single();
  if (error) throw error;
  return mapRider(data);
}

export async function updateRider(id: string, patch: { name?: string; phone?: string | null; suspended?: boolean }): Promise<Rider> {
  const supabase = requireDb();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.phone !== undefined) row.phone = patch.phone || null;
  if (patch.suspended !== undefined) {
    row.suspended = patch.suspended;
    if (patch.suspended) row.status = "offline";
  }
  const { data, error } = await supabase.from("riders").update(row).eq("id", id).select("*").single();
  if (error) throw error;
  await emitTopic(`rider:${id}`, "restaurant_updated");
  return mapRider(data);
}

export type RiderTrip = {
  orderId: string;
  status: OrderStatus;
  createdAt: number;
  deliveredAt?: number;
  pickupName: string;
  zone: string;
  deliveryFeeUsd: number;
  earningUsd: number;
};
export type RiderEarnings = {
  todayUsd: number;
  weekUsd: number;
  totalUsd: number;
  tripsToday: number;
  tripsWeek: number;
  tripsTotal: number;
  feesTotalUsd: number;
  trips: RiderTrip[];
};

/** Start of "today" in Kinshasa (UTC+1) as epoch ms. */
export function kinshasaDayStart(now = Date.now()): number {
  const shifted = now + 3600_000;
  return shifted - (shifted % 86_400_000) - 3600_000;
}

export async function riderEarnings(riderIds: string[]): Promise<Record<string, RiderEarnings>> {
  const out: Record<string, RiderEarnings> = {};
  for (const id of riderIds) out[id] = { todayUsd: 0, weekUsd: 0, totalUsd: 0, tripsToday: 0, tripsWeek: 0, tripsTotal: 0, feesTotalUsd: 0, trips: [] };
  if (!riderIds.length) return out;
  let rows: any[] = [];
  let restNames = new Map<string, string>();
  if (!supabaseConfigured()) {
    rows = memory.listOrdersAll().filter((o) => o.riderId && riderIds.includes(o.riderId)).map((o) => ({
      id: o.id, rider_id: o.riderId, status: o.status, created_at: o.createdAt, delivered_at: o.deliveredAt, updated_at: o.updatedAt,
      restaurant_id: o.restaurantId, zone: o.zone, delivery_fee_usd: o.deliveryFeeUsd, rider_earning_usd: o.riderEarningUsd,
    }));
    restNames = new Map(memory.getRestaurants().map((r) => [r.id, r.name]));
  } else {
    const supabase = getServiceClient();
    const [{ data, error }, rests] = await Promise.all([
      supabase
        .from("orders")
        .select("id,rider_id,status,created_at,updated_at,delivered_at,restaurant_id,zone,delivery_fee_usd,rider_earning_usd")
        .in("rider_id", riderIds)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("restaurants").select("id,name"),
    ]);
    if (error) throw error;
    rows = data || [];
    restNames = new Map((rests.data || []).map((r: any) => [r.id, r.name]));
  }
  const dayStart = kinshasaDayStart();
  const weekStart = dayStart - 6 * 86_400_000;
  for (const r of rows) {
    const e = out[r.rider_id];
    if (!e) continue;
    const fee = Number(r.delivery_fee_usd);
    const earn = r.rider_earning_usd != null ? Number(r.rider_earning_usd) : Math.round(fee * 80) / 100;
    const deliveredAt = r.delivered_at ? new Date(r.delivered_at).getTime() : r.status === "delivered" ? new Date(r.updated_at).getTime() : undefined;
    e.trips.push({
      orderId: r.id,
      status: r.status,
      createdAt: new Date(r.created_at).getTime(),
      deliveredAt,
      pickupName: r.restaurant_id ? restNames.get(r.restaurant_id) ?? "Restaurant" : "Dépôt Trouvailles",
      zone: r.zone,
      deliveryFeeUsd: fee,
      earningUsd: earn,
    });
    if (r.status !== "delivered" || !deliveredAt) continue;
    e.totalUsd += earn;
    e.feesTotalUsd += fee;
    e.tripsTotal++;
    if (deliveredAt >= weekStart) {
      e.weekUsd += earn;
      e.tripsWeek++;
    }
    if (deliveredAt >= dayStart) {
      e.todayUsd += earn;
      e.tripsToday++;
    }
  }
  for (const e of Object.values(out)) {
    e.todayUsd = Math.round(e.todayUsd * 100) / 100;
    e.weekUsd = Math.round(e.weekUsd * 100) / 100;
    e.totalUsd = Math.round(e.totalUsd * 100) / 100;
    e.feesTotalUsd = Math.round(e.feesTotalUsd * 100) / 100;
  }
  return out;
}

// ---------- Orders (cancel / reject / admin) ----------
const FINAL: OrderStatus[] = ["delivered", "cancelled"];

/** Customer may cancel before the restaurant accepts (or before a rider takes a Trouvailles order). */
export function customerCanCancel(o: Pick<Order, "status" | "restaurantId" | "riderId">): boolean {
  if (o.status === "placed") return true;
  if (!o.restaurantId && o.status === "rider_searching" && !o.riderId) return true;
  return false;
}

export async function cancelOrder(orderId: string, by: string, reason: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("not_found");
  if (FINAL.includes(order.status)) throw new Error("invalid_state");
  if (!supabaseConfigured()) {
    memory.updateOrderStatus(orderId, "cancelled");
    const o = memory.getOrder(orderId);
    if (o) Object.assign(o, { cancelReason: reason, cancelledBy: by });
    return;
  }
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancel_reason: reason, cancelled_by: by, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .not("status", "in", "(delivered,cancelled)");
  if (error) throw error;
  await supabase.from("dispatch_queues").delete().eq("order_id", orderId);
  if (order.riderId) await supabase.from("riders").update({ status: "online" }).eq("id", order.riderId).eq("status", "busy");
  await emitOrderEvent(orderId, { previousRiderId: order.riderId ?? null });
}

/** Cancel only if still "placed" (atomic, so a merchant accept in between wins). */
export async function cancelIfPlaced(orderId: string, by: string, reason: string, allowSearching = false): Promise<boolean> {
  if (!supabaseConfigured()) {
    const o = memory.getOrder(orderId);
    if (!o || !(o.status === "placed" || (allowSearching && o.status === "rider_searching" && !o.riderId))) return false;
    memory.updateOrderStatus(orderId, "cancelled");
    Object.assign(o, { cancelReason: reason, cancelledBy: by });
    return true;
  }
  const supabase = getServiceClient();
  const statuses = allowSearching ? ["placed", "rider_searching"] : ["placed"];
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancel_reason: reason, cancelled_by: by, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", statuses)
    .is("rider_id", null)
    .select("id");
  if (error) throw error;
  if (!data?.length) return false;
  await supabase.from("dispatch_queues").delete().eq("order_id", orderId);
  await emitOrderEvent(orderId);
  return true;
}

export async function reassignRider(orderId: string, riderId: string | null): Promise<void> {
  const supabase = requireDb();
  const order = await getOrder(orderId);
  if (!order) throw new Error("not_found");
  const allowed: OrderStatus[] = ["rider_searching", "rider_assigned", "going_to_restaurant", "arrived", "picked_up", "delivering"];
  if (!allowed.includes(order.status)) throw new Error("invalid_state");
  const prev = order.riderId ?? null;
  if (riderId === null) {
    // Put the order back into dispatch
    const { error } = await supabase
      .from("orders")
      .update({ rider_id: null, status: "rider_searching", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
    if (prev) await supabase.from("riders").update({ status: "online" }).eq("id", prev);
    const fresh = await getOrder(orderId);
    if (fresh) await buildOfferQueueForOrder(fresh);
  } else {
    const r = await supabase.from("riders").select("*").eq("id", riderId).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new Error("rider_not_found");
    if (r.data.suspended) throw new Error("rider_suspended");
    if (r.data.status === "busy" && riderId !== prev) throw new Error("rider_busy");
    const nextStatus: OrderStatus = order.status === "rider_searching" ? "rider_assigned" : order.status;
    const { error } = await supabase
      .from("orders")
      .update({ rider_id: riderId, status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
    await supabase.from("dispatch_queues").delete().eq("order_id", orderId);
    await supabase.from("riders").update({ status: "busy" }).eq("id", riderId);
    if (prev && prev !== riderId) await supabase.from("riders").update({ status: "online" }).eq("id", prev);
  }
  await emitOrderEvent(orderId, { previousRiderId: prev });
}

export async function setRefundFlag(orderId: string, flag: boolean, note?: string): Promise<void> {
  const supabase = requireDb();
  const { error } = await supabase
    .from("orders")
    .update({ refund_flag: flag, refund_note: note || null, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
  await emitOrderEvent(orderId);
}

export type AdminOrderFilter = {
  status?: "active" | "new" | "kitchen" | "delivery" | "delivered" | "cancelled" | "refund" | "all";
  q?: string;
  restaurantId?: string;
  limit?: number;
};

export const ADMIN_FILTER_STATUSES: Record<Exclude<AdminOrderFilter["status"], undefined | "all" | "refund">, OrderStatus[]> = {
  active: ["placed", "restaurant_accepted", "preparing", "rider_searching", "rider_assigned", "going_to_restaurant", "arrived", "picked_up", "delivering"],
  new: ["placed"],
  kitchen: ["restaurant_accepted", "preparing"],
  delivery: ["rider_searching", "rider_assigned", "going_to_restaurant", "arrived", "picked_up", "delivering"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

export async function searchOrdersAdmin(f: AdminOrderFilter): Promise<Order[]> {
  const limit = Math.min(f.limit ?? 100, 300);
  const q = (f.q || "").trim().toLowerCase();
  const matches = (o: Order) =>
    !q ||
    o.id.toLowerCase().includes(q) ||
    o.address.toLowerCase().includes(q) ||
    (o.customerPhone || "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
    o.items.some((i) => i.name.toLowerCase().includes(q));
  const byStatus = (o: Order) => {
    if (!f.status || f.status === "all") return true;
    if (f.status === "refund") return !!o.refundFlag;
    return ADMIN_FILTER_STATUSES[f.status].includes(o.status);
  };
  if (!supabaseConfigured()) {
    return memory
      .listOrdersAll()
      .filter((o) => byStatus(o) && matches(o) && (!f.restaurantId || o.restaurantId === f.restaurantId))
      .slice(0, limit);
  }
  const supabase = getServiceClient();
  let query = supabase.from("orders").select("*, order_items(*), support_notes(*)").order("created_at", { ascending: false }).limit(q ? 500 : limit);
  if (f.status && f.status !== "all") {
    if (f.status === "refund") query = query.eq("refund_flag", true);
    else query = query.in("status", ADMIN_FILTER_STATUSES[f.status]);
  }
  if (f.restaurantId) query = query.eq("restaurant_id", f.restaurantId);
  const { data, error } = await query;
  if (error) throw error;
  const orders = (data || []).map(mapOrderWithRelations).filter(matches).slice(0, limit);
  return hydrateOrderImages(orders);
}

// ---------- Saved addresses ----------
export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  notes?: string;
  zone: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
};

const memAddresses = ((globalThis as any).__apporteAddresses ||= new Map<string, SavedAddress[]>()) as Map<string, SavedAddress[]>;

function mapAddress(a: any): SavedAddress {
  return {
    id: a.id,
    label: a.label,
    address: a.address,
    notes: a.notes ?? undefined,
    zone: a.zone,
    lat: a.lat ?? undefined,
    lng: a.lng ?? undefined,
    isDefault: !!a.is_default,
  };
}

export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  if (!supabaseConfigured()) return memAddresses.get(userId) ?? [];
  const { data, error } = await getServiceClient()
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapAddress);
}

export async function saveAddress(userId: string, a: Omit<SavedAddress, "id"> & { id?: string }): Promise<SavedAddress> {
  if (!supabaseConfigured()) {
    const list = [...(memAddresses.get(userId) ?? [])];
    const item = { ...a, id: a.id || randomId("addr") } as SavedAddress;
    const i = list.findIndex((x) => x.id === item.id);
    if (item.isDefault) list.forEach((x) => (x.isDefault = false));
    if (i >= 0) list[i] = item;
    else list.push(item);
    memAddresses.set(userId, list);
    return item;
  }
  const supabase = getServiceClient();
  if (a.id) {
    const own = await supabase.from("saved_addresses").select("id").eq("id", a.id).eq("user_id", userId).maybeSingle();
    if (!own.data) throw new Error("not_found");
  } else {
    const { count } = await supabase.from("saved_addresses").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if ((count ?? 0) >= 10) throw new Error("too_many_addresses");
  }
  if (a.isDefault) await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", userId);
  const row = {
    id: a.id || randomId("addr"),
    user_id: userId,
    label: a.label,
    address: a.address,
    notes: a.notes || null,
    zone: a.zone,
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    is_default: a.isDefault,
  };
  const { data, error } = await supabase.from("saved_addresses").upsert(row).select("*").single();
  if (error) throw error;
  return mapAddress(data);
}

export async function deleteAddress(userId: string, id: string): Promise<boolean> {
  if (!supabaseConfigured()) {
    const list = memAddresses.get(userId) ?? [];
    memAddresses.set(userId, list.filter((x) => x.id !== id));
    return list.some((x) => x.id === id);
  }
  const { data, error } = await getServiceClient().from("saved_addresses").delete().eq("id", id).eq("user_id", userId).select("id");
  if (error) throw error;
  return !!data?.length;
}

// ---------- Push subscriptions ----------
export async function savePushSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
  const supabase = requireDb();
  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    user_id: userId,
    p256dh: sub.p256dh,
    auth: sub.auth,
    user_agent: sub.userAgent?.slice(0, 300) ?? null,
  });
  if (error) throw error;
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const supabase = requireDb();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  if (error) throw error;
}
