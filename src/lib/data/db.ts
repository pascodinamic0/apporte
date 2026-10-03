import {
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Restaurant,
  Rider,
  RiderStatus,
  SmartFindProduct,
  SupportNote,
  RiderPayout,
  SupportRequest,
  SupportRequestStatus,
  UserRole,
} from "../types";
import { PILOT_ZONE } from "../seed";
import { markRiderPresent, riderIsPresent, stepDispatchQueue } from "../dispatch";
import { riderEarningsUsd, summarizeRiderEarnings } from "../earnings";
import { HUB, OFFER_LEASE_MS, deliveryLegKm, haversineKm, quoteDeliveryFeeUsd } from "../geo";
import { lockedPayoutOrderIds, mobileMoneyProvider, selectWithdrawable } from "../payouts";
import { normalizeDrcPhone } from "../phone";
import { generatePin, randomId } from "../utils";
import { getServiceClient } from "../supabase/server";
import * as memory from "./memory";
import { computeBreakdown, DEFAULT_FEES, zoneFee } from "../fees";
import { normalizeHours, restaurantAvailability } from "../hours";
import { getFeeSettings, listZones } from "./settings";
import { emitOrderEvent } from "../events";
import { CatalogError } from "../catalogError";

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// Restaurants
export async function getRestaurants(): Promise<Restaurant[]> {
  if (!supabaseConfigured()) return memory.getRestaurants();
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("suspended", false)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRestaurant);
}

export async function getRestaurant(id: string): Promise<Restaurant | undefined> {
  if (!supabaseConfigured()) return memory.getRestaurant(id);
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("restaurants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRestaurant(data) : undefined;
}

export async function getMenuForRestaurant(restaurantId: string): Promise<MenuItem[]> {
  if (!supabaseConfigured()) return memory.getMenuForRestaurant(restaurantId);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("archived", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMenuItem);
}

// Catalog
export async function listSmartFinds(): Promise<SmartFindProduct[]> {
  if (!supabaseConfigured()) return memory.listSmartFinds();
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("smart_find_products").select("*").order("name");
  if (error) throw error;
  return (data || []).map(mapProduct);
}

// Riders
export async function listRiders(): Promise<Rider[]> {
  if (!supabaseConfigured()) return memory.listRiders();
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("riders").select("*").order("name");
  if (error) throw error;
  return (data || []).map(mapRider);
}

export async function getRider(id: string): Promise<Rider | undefined> {
  if (!supabaseConfigured()) return memory.getRider(id);
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("riders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRider(data) : undefined;
}

export async function getUserForRider(riderId: string) {
  if (!supabaseConfigured()) return memory.getUserForRider(riderId);
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("users").select("*").eq("rider_id", riderId).maybeSingle();
  if (error) throw error;
  return data ? mapUserRow(data) : undefined;
}

export async function setRiderStatus(riderId: string, status: RiderStatus) {
  if (!supabaseConfigured()) return memory.setRiderStatus(riderId, status);
  const supabase = getServiceClient();
  const { error } = await supabase.from("riders").update({ status }).eq("id", riderId);
  if (error) throw error;
  if (status === "offline") await releaseOffersHeldBy(riderId);
}

// Menu admin
export async function toggleMenuItemAvailability(menuItemId: string, available: boolean) {
  if (!supabaseConfigured()) return memory.toggleMenuItemAvailability(menuItemId, available);
  const supabase = getServiceClient();
  const { error } = await supabase.from("menu_items").update({ available }).eq("id", menuItemId);
  if (error) throw error;
}
export async function updateMenuItemPrice(menuItemId: string, priceUsd: number) {
  if (!supabaseConfigured()) return memory.updateMenuItemPrice(menuItemId, priceUsd);
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ price_usd: priceUsd })
    .eq("id", menuItemId);
  if (error) throw error;
}

// Orders
const ORDER_SELECT =
  "*, order_items(*), support_notes(*)";

export async function listOrdersAll(): Promise<Order[]> {
  if (!supabaseConfigured()) return memory.listOrdersAll();
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await hydrateOrderImages((data || []).map(mapOrderWithRelations));
}
export async function listOrdersForRestaurant(restaurantId: string): Promise<Order[]> {
  if (!supabaseConfigured()) return memory.listOrdersForRestaurant(restaurantId);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await hydrateOrderImages((data || []).map(mapOrderWithRelations));
}
export async function listOrdersForRider(riderId: string): Promise<Order[]> {
  if (!supabaseConfigured()) return memory.listOrdersForRider(riderId);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await hydrateOrderImages((data || []).map(mapOrderWithRelations));
}
export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  if (!supabaseConfigured()) return memory.listOrdersForCustomer(customerId);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await hydrateOrderImages((data || []).map(mapOrderWithRelations));
}
export async function getOrder(id: string): Promise<Order | undefined> {
  if (!supabaseConfigured()) return memory.getOrder(id);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const base = mapOrderWithRelations(data);
  const [hydrated] = await hydrateOrderImages([base]);
  return hydrated;
}

export async function createOrder(params: {
  customerId: string;
  restaurantId?: string;
  items: OrderItem[];
  address: string;
  addressNotes?: string;
  customerPhone?: string;
  zone?: string;
  paymentMethod: PaymentMethod;
  deliveryLat?: number;
  deliveryLng?: number;
}): Promise<Order> {
  if (!supabaseConfigured()) return memory.createOrder(params);
  const supabase = getServiceClient();
  // Closed, paused or suspended restaurants cannot take orders
  let restaurant: Restaurant | undefined;
  if (params.restaurantId) {
    restaurant = await getRestaurant(params.restaurantId);
    if (!restaurant) throw new Error("invalid_restaurant");
    if (!restaurant.isOpen) throw new Error("restaurant_closed");
  }
  const [fees, zones] = await Promise.all([getFeeSettings(), listZones()]);
  const zoneName = params.zone ?? PILOT_ZONE;
  const fee = zoneFee(zones, zoneName);
  if (fee == null) throw new Error("zone_not_served");
  // Recompute prices and names server-side from DB
  const menuIds = params.items.filter((i) => i.kind === "food" && i.menuItemId).map((i) => i.menuItemId as string);
  const prodIds = params.items.filter((i) => i.kind === "smart_find" && i.productId).map((i) => i.productId as string);
  const [menuRes, prodRes] = await Promise.all([
    menuIds.length ? supabase.from("menu_items").select("*").in("id", menuIds) : Promise.resolve({ data: [], error: null } as any),
    prodIds.length ? supabase.from("smart_find_products").select("*").in("id", prodIds) : Promise.resolve({ data: [], error: null } as any),
  ]);
  if (menuRes.error) throw menuRes.error;
  if (prodRes.error) throw prodRes.error;
  const menuById = new Map<string, any>((menuRes.data || []).map((m: any) => [m.id, m]));
  const prodById = new Map<string, any>((prodRes.data || []).map((p: any) => [p.id, p]));

  const unavailableNames: string[] = [];
  const serverItems: {
    id: string;
    order_id: string;
    kind: string;
    restaurant_id: string | null;
    menu_item_id: string | null;
    product_id: string | null;
    name: string;
    quantity: number;
    unit_price_usd: number;
    image_url: string | null;
  }[] = [];
  for (const it of params.items) {
    if (it.kind === "food" && it.menuItemId) {
      const m = menuById.get(it.menuItemId);
      if (!m) throw new CatalogError("invalid_item");
      if (m.available === false) {
        unavailableNames.push(String(m.name));
        continue;
      }
      // Enforce restaurant if provided
      if (params.restaurantId && m.restaurant_id !== params.restaurantId) throw new CatalogError("invalid_restaurant_item");
      serverItems.push({
        id: randomId("oi"),
        order_id: "PENDING", // placeholder, filled later
        kind: "food",
        restaurant_id: m.restaurant_id,
        menu_item_id: m.id,
        product_id: null,
        name: String(m.name),
        quantity: Number(it.quantity || 1),
        unit_price_usd: Number(m.price_usd),
        image_url: m.image_url ?? null,
      });
      continue;
    }
    if (it.kind === "smart_find" && it.productId) {
      const p = prodById.get(it.productId);
      if (!p) throw new CatalogError("invalid_item");
      serverItems.push({
        id: randomId("oi"),
        order_id: "PENDING",
        kind: "smart_find",
        restaurant_id: null,
        menu_item_id: null,
        product_id: p.id,
        name: String(p.name),
        quantity: Number(it.quantity || 1),
        unit_price_usd: Number(p.price_usd),
        image_url: p.image_url ?? null,
      });
      continue;
    }
    throw new CatalogError("invalid_item");
  }
  if (unavailableNames.length) throw new CatalogError("unavailable_item", unavailableNames);

  const subtotal = serverItems.reduce((sum, it) => sum + it.unit_price_usd * it.quantity, 0);
  const bd = computeBreakdown(subtotal, fee, fees, restaurant?.commissionPct ?? null);
  const pin = generatePin(4);
  const now = Date.now();
  const id = randomId("ord");
  const orderRow = {
    id,
    customer_id: params.customerId,
    restaurant_id: params.restaurantId ?? null,
    rider_id: null,
    subtotal_usd: bd.subtotalUsd,
    delivery_fee_usd: bd.deliveryFeeUsd,
    total_usd: bd.totalUsd,
    commission_usd: params.restaurantId ? bd.commissionUsd : 0,
    rider_earning_usd: bd.riderEarningUsd,
    vat_usd: bd.vatUsd,
    delivery_lat: params.deliveryLat ?? null,
    delivery_lng: params.deliveryLng ?? null,
    address: params.address,
    address_notes: params.addressNotes ?? null,
    customer_phone: params.customerPhone ?? null,
    zone: zoneName,
    payment_method: params.paymentMethod,
    payment_status: "unpaid",
    status: (params.restaurantId ? "placed" : "rider_searching") as OrderStatus,
    pin,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    rating_stars: null,
    rating_comment: null,
    rating_created_at: null,
  };
  const ins = await supabase.from("orders").insert(orderRow);
  if (ins.error) throw ins.error;
  // Insert items with server-computed prices (must not leave an orphan order)
  const itemRows = serverItems.map((row) => {
    const { order_id: _pending, ...rest } = row;
    return { ...rest, order_id: id };
  });
  if (itemRows.length === 0) {
    await supabase.from("orders").delete().eq("id", id);
    throw new Error("invalid_item");
  }
  const insItems = await supabase.from("order_items").insert(itemRows).select("id");
  if (insItems.error || (insItems.data || []).length !== itemRows.length) {
    await supabase.from("orders").delete().eq("id", id);
    throw insItems.error || new Error("order_items_insert_failed");
  }
  // If Smart Finds (no restaurant), immediately build the rider offer queue
  if (!params.restaurantId) {
    const fullNow = await getOrder(id);
    if (fullNow) {
      await buildOfferQueueForOrder(fullNow);
    }
  }
  // Return assembled — refuse empty-item orders
  const full = await getOrder(id);
  if (!full || full.items.length === 0) {
    await supabase.from("order_items").delete().eq("order_id", id);
    await supabase.from("orders").delete().eq("id", id);
    throw new Error("Order creation failed");
  }
  await emitOrderEvent(id, { created: true });
  return full;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra: Record<string, unknown> = {},
) {
  if (!supabaseConfigured()) return memory.updateOrderStatus(orderId, status);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", orderId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (status === "rider_searching" && data) {
    const order = mapOrderRow(data);
    await buildOfferQueueForOrder(order);
  }
  await emitOrderEvent(orderId);
}

export async function setOrderRating(
  orderId: string,
  stars: 1 | 2 | 3 | 4 | 5,
  comment?: string,
) {
  if (!supabaseConfigured()) return memory.setOrderRating(orderId, stars, comment);
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("orders")
    .update({
      rating_stars: stars,
      rating_comment: comment ?? null,
      rating_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
}

export async function addSupportNote(
  orderId: string,
  note: string,
  createdBy: string,
): Promise<SupportNote> {
  if (!supabaseConfigured()) return memory.addSupportNote(orderId, note, createdBy);
  const supabase = getServiceClient();
  const insert = await supabase
    .from("support_notes")
    .insert({
      id: randomId("note"),
      order_id: orderId,
      note,
      created_by: createdBy,
    })
    .select("*")
    .maybeSingle();
  if (insert.error) throw insert.error;
  if (!insert.data) throw new Error("Failed to add note");
  return mapSupportNote(insert.data);
}

// Dispatch
export async function nextOfferForRider(riderId: string, skip: Set<string> = new Set()) {
  if (!supabaseConfigured()) return memory.nextOfferForRider(riderId, skip);
  const supabase = getServiceClient();
  const rres = await supabase.from("riders").select("*").eq("id", riderId).maybeSingle();
  if (rres.error) throw rres.error;
  const rider = rres.data ? mapRider(rres.data) : undefined;
  if (!rider || rider.status !== "online" || rider.suspended) return null;
  const ores = await supabase
    .from("orders")
    .select("*")
    .eq("status", "rider_searching")
    .order("created_at", { ascending: true });
  if (ores.error) throw ores.error;
  const qres = await supabase.from("dispatch_queues").select("*");
  if (qres.error) throw qres.error;
  const dqByOrder = new Map<string, any>((qres.data || []).map((q) => [q.order_id, q]));
  const online = await onlineRiderIds();
  const now = Date.now();
  markRiderPresent(riderId, now);

  for (const row of ores.data || []) {
    const o = mapOrderRow(row);
    const q = dqByOrder.get(o.id);
    // Only a queue created when the order became searchable is a real offer.
    // Building one on read is what resurfaced old courses as new ones.
    if (!q) continue;
    let riderIds: string[] = Array.isArray(q.rider_ids) ? [...q.rider_ids] : [];
    if (!riderIds.length) continue;
    const missing = [...online].filter((id) => !riderIds.includes(id));
    if (missing.length) {
      riderIds = [...riderIds, ...missing];
      await supabase.from("dispatch_queues").update({ rider_ids: riderIds, updated_at: new Date().toISOString() }).eq("order_id", o.id);
    }
    const step = stepDispatchQueue(
      {
        riderIds,
        currentIndex: q.current_index ?? 0,
        expireAt: q.expire_at ? new Date(q.expire_at).getTime() : undefined,
      },
      riderId,
      { now, online, declined: skip.has(o.id), present: (id) => riderIsPresent(id, now) },
    );
    if (step.changed) {
      await supabase
        .from("dispatch_queues")
        .update({
          current_index: step.currentIndex,
          expire_at: new Date(step.expireAt ?? now).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", o.id);
    }
    if (!step.offer || !step.expireAt) continue;
    const offer = await buildOffer(o.id, riderId);
    if (!offer) continue;
    return { ...offer, expiresAt: step.expireAt };
  }
  return null;
}

export async function declineOffer(riderId: string, orderId: string) {
  if (!supabaseConfigured()) return memory.declineOffer(riderId, orderId);
  const supabase = getServiceClient();
  const qres = await supabase.from("dispatch_queues").select("*").eq("order_id", orderId).maybeSingle();
  if (qres.error) throw qres.error;
  const q = qres.data;
  if (!q) return;
  const idx = q.current_index ?? 0;
  const current: string | undefined = q.rider_ids?.[idx];
  if (current === riderId) {
    const ids: string[] = Array.isArray(q.rider_ids) ? q.rider_ids : [];
    const online = await onlineRiderIds();
    const moved = nextOnlineForward(ids, idx + 1, online);
    await supabase
      .from("dispatch_queues")
      .update({
        current_index: moved == null ? ids.length : moved,
        expire_at: new Date(Date.now() + (moved == null ? 0 : OFFER_LEASE_MS)).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);
    await emitOrderEvent(orderId);
  }
}

export async function acceptOffer(riderId: string, orderId: string) {
  if (!supabaseConfigured()) return memory.acceptOffer(riderId, orderId);
  const supabase = getServiceClient();
  const qres = await supabase.from("dispatch_queues").select("*").eq("order_id", orderId).maybeSingle();
  if (qres.error) throw qres.error;
  const q = qres.data;
  if (!q) return false;
  const idx = q.current_index ?? 0;
  const current: string | undefined = q.rider_ids?.[idx];
  if (current !== riderId) return false;
  const upd = await supabase
    .from("orders")
    .update({ rider_id: riderId, status: "rider_assigned", updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (upd.error) throw upd.error;
  const updR = await supabase.from("riders").update({ status: "busy" }).eq("id", riderId);
  if (updR.error) throw updR.error;
  await emitOrderEvent(orderId);
  return true;
}

export async function confirmPickup(riderId: string, orderId: string) {
  if (!supabaseConfigured()) return memory.confirmPickup(riderId, orderId);
  const supabase = getServiceClient();
  const ores = await supabase.from("orders").select("rider_id").eq("id", orderId).maybeSingle();
  if (ores.error) throw ores.error;
  if (!ores.data || ores.data.rider_id !== riderId) return false;
  const { error } = await supabase
    .from("orders")
    .update({ status: "picked_up", updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
  await emitOrderEvent(orderId);
  return true;
}

export async function confirmDelivered(riderId: string, orderId: string, enteredPin: string) {
  if (!supabaseConfigured()) return memory.confirmDelivered(riderId, orderId, enteredPin);
  const supabase = getServiceClient();
  const ores = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (ores.error) throw ores.error;
  const o = ores.data ? mapOrderRow(ores.data) : undefined;
  if (!o || o.riderId !== riderId) return { ok: false as const, reason: "not_found" as const };
  if (o.pin !== enteredPin) return { ok: false as const, reason: "bad_pin" as const };
  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered", updated_at: new Date().toISOString(), delivered_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
  // Update rider earnings and status
  const earn = riderEarningsUsd(o.deliveryFeeUsd);
  // Read-modify-write
  const rNow = await supabase.from("riders").select("*").eq("id", riderId).maybeSingle();
  if (rNow.error) throw rNow.error;
  if (rNow.data) {
    const cur = parseFloat(String((rNow.data as any).earnings_today_usd ?? 0)) || 0;
    const wr = await supabase
      .from("riders")
      .update({ status: "online", earnings_today_usd: round2(cur + earn) })
      .eq("id", riderId);
    if (wr.error) throw wr.error;
  }
  await emitOrderEvent(orderId);
  return { ok: true as const };
}

export async function progressToGoing(riderId: string, orderId: string) {
  if (!supabaseConfigured()) return memory.progressToGoing(riderId, orderId);
  return await guardRiderProgress(riderId, orderId, "going_to_restaurant");
}
export async function progressToArrived(riderId: string, orderId: string) {
  if (!supabaseConfigured()) return memory.progressToArrived(riderId, orderId);
  return await guardRiderProgress(riderId, orderId, "arrived");
}
export async function progressToDelivering(riderId: string, orderId: string) {
  if (!supabaseConfigured()) return memory.progressToDelivering(riderId, orderId);
  return await guardRiderProgress(riderId, orderId, "delivering");
}
export async function progressToCustomer(riderId: string, orderId: string) {
  if (!supabaseConfigured()) return memory.progressToCustomer(riderId, orderId);
  return await guardRiderProgress(riderId, orderId, "arrived_at_customer");
}

export async function setRiderPayout(orderId: string, paid: boolean) {
  if (!supabaseConfigured()) return memory.setRiderPayout(orderId, paid);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ rider_paid_at: paid ? new Date().toISOString() : null })
    .eq("id", orderId)
    .eq("status", "delivered")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (paid && data) await closeCoveredPayouts([orderId]);
  return !!data;
}

export async function listRiderPayouts(riderId?: string): Promise<RiderPayout[]> {
  if (!supabaseConfigured()) return memory.listRiderPayouts(riderId);
  const supabase = getServiceClient();
  let query = supabase.from("rider_payouts").select("*").order("created_at", { ascending: false });
  if (riderId) query = query.eq("rider_id", riderId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapRiderPayout);
}

export async function createRiderPayout(
  riderId: string,
  phone: string,
): Promise<{ ok: true; payout: RiderPayout } | { ok: false; reason: "invalid_phone" | "nothing_to_withdraw" }> {
  if (!supabaseConfigured()) return memory.createRiderPayout(riderId, phone);
  const normalized = normalizeDrcPhone(phone);
  const network = normalized ? mobileMoneyProvider(normalized) : null;
  if (!normalized || !network) return { ok: false, reason: "invalid_phone" };
  const [orders, payouts] = await Promise.all([listOrdersForRider(riderId), listRiderPayouts(riderId)]);
  const { orderIds, amountUsd } = selectWithdrawable(orders, lockedPayoutOrderIds(payouts));
  if (!orderIds.length || amountUsd <= 0) return { ok: false, reason: "nothing_to_withdraw" };
  const now = new Date().toISOString();
  const row = {
    id: randomId("pay"),
    rider_id: riderId,
    amount_usd: amountUsd,
    order_ids: orderIds,
    phone: normalized,
    provider: network.provider,
    status: "requested",
    created_at: now,
    updated_at: now,
  };
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("rider_payouts").insert(row).select("*").maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: "nothing_to_withdraw" };
  return { ok: true, payout: mapRiderPayout(data) };
}

export async function settleRiderPayout(id: string, action: "pay" | "reject"): Promise<RiderPayout | undefined> {
  if (!supabaseConfigured()) return memory.settleRiderPayout(id, action);
  const supabase = getServiceClient();
  const existing = await supabase.from("rider_payouts").select("*").eq("id", id).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data || existing.data.status !== "requested") return undefined;
  const now = new Date().toISOString();
  if (action === "pay") {
    const orderIds: string[] = Array.isArray(existing.data.order_ids) ? existing.data.order_ids : [];
    if (orderIds.length) {
      const upd = await supabase
        .from("orders")
        .update({ rider_paid_at: now, updated_at: now })
        .in("id", orderIds)
        .eq("status", "delivered")
        .is("rider_paid_at", null);
      if (upd.error) throw upd.error;
    }
  }
  const { data, error } = await supabase
    .from("rider_payouts")
    .update({
      status: action === "pay" ? "paid" : "rejected",
      paid_at: action === "pay" ? now : null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "requested")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapRiderPayout(data) : undefined;
}

async function closeCoveredPayouts(orderIds: string[]) {
  const supabase = getServiceClient();
  for (const orderId of orderIds) {
    const { data, error } = await supabase.from("rider_payouts").select("*").eq("status", "requested").contains("order_ids", [orderId]);
    if (error) throw error;
    for (const row of data || []) {
      const ids: string[] = Array.isArray(row.order_ids) ? row.order_ids : [];
      if (!ids.length) continue;
      const orders = await supabase.from("orders").select("id,rider_paid_at").in("id", ids);
      if (orders.error) throw orders.error;
      const paid = new Set((orders.data || []).filter((o) => o.rider_paid_at).map((o) => o.id));
      if (!ids.every((id) => paid.has(id))) continue;
      const now = new Date().toISOString();
      await supabase.from("rider_payouts").update({ status: "paid", paid_at: now, updated_at: now }).eq("id", row.id).eq("status", "requested");
    }
  }
}

export async function createSupportRequest(input: {
  userId: string;
  userName: string;
  role: UserRole;
  topic: string;
  message: string;
  orderId?: string;
  priority: "normal" | "urgent";
}): Promise<SupportRequest> {
  if (!supabaseConfigured()) return memory.createSupportRequest(input);
  const supabase = getServiceClient();
  const id = randomId("sup");
  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      id,
      user_id: input.userId,
      user_name: input.userName,
      role: input.role,
      topic: input.topic,
      message: input.message,
      order_id: input.orderId ?? null,
      priority: input.priority,
      status: "open",
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Failed to create support request");
  return mapSupportRequest(data);
}

export async function listSupportRequests(): Promise<SupportRequest[]> {
  if (!supabaseConfigured()) return memory.listSupportRequests();
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("support_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSupportRequest);
}

export async function setSupportRequestStatus(id: string, status: SupportRequestStatus): Promise<SupportRequest | undefined> {
  if (!supabaseConfigured()) return memory.setSupportRequestStatus(id, status);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("support_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapSupportRequest(data) : undefined;
}

async function guardRiderProgress(riderId: string, orderId: string, status: OrderStatus) {
  const supabase = getServiceClient();
  const ores = await supabase.from("orders").select("rider_id").eq("id", orderId).maybeSingle();
  if (ores.error) throw ores.error;
  if (!ores.data || ores.data.rider_id !== riderId) return false;
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
  await emitOrderEvent(orderId);
  return true;
}

export async function merchantAccept(orderId: string, prepMinutes?: number) {
  if (!supabaseConfigured()) return memory.merchantAccept(orderId);
  await updateOrderStatus(orderId, "restaurant_accepted", {
    accepted_at: new Date().toISOString(),
    ...(prepMinutes ? { prep_minutes: prepMinutes } : {}),
  });
  return true;
}
export async function merchantSetPreparing(orderId: string) {
  if (!supabaseConfigured()) return memory.merchantSetPreparing(orderId);
  await updateOrderStatus(orderId, "preparing");
  return true;
}
export async function merchantSetReady(orderId: string) {
  if (!supabaseConfigured()) return memory.merchantSetReady(orderId);
  await updateOrderStatus(orderId, "rider_searching");
  return true;
}

// Demo users accessor
export async function getDemoUsers() {
  if (!supabaseConfigured()) return memory.getDemoUsers();
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", ["u_customer", "u_merchant", "u_rider", "u_admin"])
    .order("id");
  if (error) throw error;
  return (data || []).map(mapUserRow);
}

// Helpers and mappers
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
/** Rider share stored on the order at checkout, otherwise the default percentage of the delivery fee. */
function estimateEarningsUsd(order: Order): number {
  return order.riderEarningUsd ?? round2((order.deliveryFeeUsd * DEFAULT_FEES.riderSharePct) / 100);
}

async function buildOffer(orderId: string, riderId: string) {
  const supabase = getServiceClient();
  const [oRes, rRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("riders").select("*").eq("id", riderId).maybeSingle(),
  ]);
  if (oRes.error) throw oRes.error;
  if (rRes.error) throw rRes.error;
  if (!oRes.data || !rRes.data) return null;
  const o = mapOrderRow(oRes.data);
  const rider = mapRider(rRes.data);
  const rest = o.restaurantId ? await getRestaurant(o.restaurantId) : undefined;
  const pickupLat = rest?.latitude ?? HUB.lat;
  const pickupLon = rest?.longitude ?? HUB.lon;
  const pickupDistance = haversineKm(rider.latitude, rider.longitude, pickupLat, pickupLon);
  // Fetch first item for thumbnail/name
  let firstItemName: string | undefined = undefined;
  let firstItemImageUrl: string | undefined = undefined;
  const iRes = await supabase
    .from("order_items")
    .select("name,image_url,menu_item_id")
    .eq("order_id", orderId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!iRes.error && iRes.data) {
    firstItemName = (iRes.data as any).name || undefined;
    firstItemImageUrl = (iRes.data as any).image_url || undefined;
    // Backfill from menu_items if missing
    if (!firstItemImageUrl && (iRes.data as any).menu_item_id) {
      const m = await supabase
        .from("menu_items")
        .select("image_url")
        .eq("id", (iRes.data as any).menu_item_id)
        .maybeSingle();
      if (!m.error && m.data) firstItemImageUrl = (m.data as any).image_url || undefined;
    }
  }
  // Pickup label/name
  const pickupName = rest?.name ?? "Dépôt Trouvailles Apporte";
  const pickupZone = rest?.zone ?? o.zone;
  const deliveryDistance = deliveryLegKm(pickupLat, pickupLon);
  const eta = Math.max(8, Math.round(pickupDistance * 6 + deliveryDistance * 6 + 6));
  return {
    orderId,
    orderRef: orderId.slice(-6),
    riderId,
    pickupDistanceKm: round2(pickupDistance),
    deliveryDistanceKm: deliveryDistance,
    etaMinutes: eta,
    deliveryFeeUsd: o.deliveryFeeUsd,
    earningsUsd: riderEarningsUsd(o.deliveryFeeUsd),
    expiresAt: Date.now() + OFFER_LEASE_MS,
    // Enriched fields for rider offer card
    deliveryAddress: o.address,
    deliveryZone: o.zone,
    firstItemName,
    firstItemImageUrl,
    pickupName,
    pickupZone,
  };
}

export async function buildOfferQueueForOrder(order: Order) {
  const supabase = getServiceClient();
  const rest = order.restaurantId ? await getRestaurant(order.restaurantId) : undefined;
  const { data, error } = await supabase.from("riders").select("*").eq("status", "online").eq("suspended", false);
  if (error) throw error;
  const eligible = (data || []).map(mapRider);
  const ranked = eligible
    .map((r) => {
      const pickup =
        rest?.latitude && rest.longitude
          ? haversineKm(r.latitude, r.longitude, rest.latitude, rest.longitude)
          : haversineKm(r.latitude, r.longitude, HUB.lat, HUB.lon);
      const score = 100 - pickup * 10 + r.reliabilityPercent * 0.1;
      return { riderId: r.id, pickup, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.riderId);
  await supabase
    .from("dispatch_queues")
    .upsert(
      {
        order_id: order.id,
        rider_ids: ranked,
        current_index: 0,
        expire_at: new Date(Date.now() + OFFER_LEASE_MS).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_id" },
    );
}

function nextOnlineForward(riderIds: string[], start: number, online: Set<string>): number | null {
  for (let i = start; i < riderIds.length; i++) {
    if (online.has(riderIds[i])) return i;
  }
  return null;
}

async function onlineRiderIds(): Promise<Set<string>> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("riders").select("id").eq("status", "online");
  if (error) throw error;
  return new Set((data || []).map((r: { id: string }) => r.id));
}

/** Drop the lease so the next online rider can take the course. */
async function releaseOffersHeldBy(riderId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("dispatch_queues").select("order_id,rider_ids,current_index");
  if (error) throw error;
  const now = new Date().toISOString();
  for (const q of data || []) {
    const ids: string[] = Array.isArray(q.rider_ids) ? q.rider_ids : [];
    const idx = Math.max(0, q.current_index ?? 0);
    if (ids[idx] !== riderId) continue;
    await supabase.from("dispatch_queues").update({ expire_at: now, updated_at: now }).eq("order_id", q.order_id);
  }
}

export function mapOrderWithRelations(row: any): Order {
  const base = mapOrderRow(row);
  const rawItems = Array.isArray(row.order_items) ? row.order_items : [];
  // Stable order by created_at when embedded
  rawItems.sort((a: any, b: any) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
  base.items = rawItems.map(mapOrderItem);
  const rawNotes = Array.isArray(row.support_notes) ? row.support_notes : [];
  rawNotes.sort((a: any, b: any) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
  const notes = rawNotes.map(mapSupportNote);
  base.supportNotes = notes.length ? notes : undefined;
  return base;
}

/**
 * Item images come from the current catalogue (menu items / Trouvailles), so old
 * orders never point at removed files or dead third-party URLs. A stored image is
 * only kept when the catalogue has none and it is a local file.
 */
export async function hydrateOrderImages(orders: Order[]): Promise<Order[]> {
  if (orders.length === 0) return [];
  const all = orders.flatMap((o) => o.items);
  const menuIds = Array.from(new Set(all.map((i) => i.menuItemId).filter(Boolean) as string[]));
  const prodIds = Array.from(new Set(all.map((i) => i.productId).filter(Boolean) as string[]));
  if (menuIds.length === 0 && prodIds.length === 0) return orders;
  const supabase = getServiceClient();
  const imageById = new Map<string, string>();
  // Chunk to stay under PostgREST URL limits
  const chunkSize = 100;
  for (const [table, ids] of [["menu_items", menuIds], ["smart_find_products", prodIds]] as const) {
    for (let i = 0; i < ids.length; i += chunkSize) {
      const { data, error } = await supabase.from(table).select("id,image_url").in("id", ids.slice(i, i + chunkSize));
      if (error) throw error;
      for (const m of (data || []) as { id: string; image_url: string | null }[]) {
        if (m.id && m.image_url) imageById.set(m.id, m.image_url);
      }
    }
  }
  const localOnly = (u?: string) => (u && u.startsWith("/images/") && !u.startsWith("/images/menu/") ? u : undefined);
  return orders.map((o) => ({
    ...o,
    items: o.items.map((it) => ({
      ...it,
      imageUrl: imageById.get(it.menuItemId || it.productId || "") || localOnly(it.imageUrl),
    })),
  }));
}

// Row -> type mappers
export function mapRestaurant(r: any): Restaurant {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    cuisine: r.cuisine,
    etaMinutes: r.eta_minutes,
    rating: Number(r.rating ?? 0),
    imageUrl: r.image_url ?? undefined,
    zone: r.zone,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    ...restaurantState(r),
  };
}
export function restaurantState(r: any) {
  const hours = normalizeHours(r.hours);
  const availability = restaurantAvailability({
    acceptingOrders: r.accepting_orders !== false,
    suspended: !!r.suspended,
    hours,
  });
  return {
    isOpen: availability.open,
    acceptingOrders: r.accepting_orders !== false,
    hours,
    suspended: !!r.suspended,
    commissionPct: r.commission_pct != null ? Number(r.commission_pct) : null,
    phone: r.phone ?? undefined,
    availability,
  };
}
export function mapMenuItem(m: any): MenuItem {
  return {
    id: m.id,
    restaurantId: m.restaurant_id,
    name: m.name,
    description: m.description ?? undefined,
    priceUsd: Number(m.price_usd),
    available: !!m.available,
    imageUrl: m.image_url ?? undefined,
    cuisineTag: m.cuisine_tag ?? undefined,
    category: m.category ?? undefined,
    sortOrder: Number(m.sort_order ?? 0),
  };
}
function mapProduct(p: any): SmartFindProduct {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    priceUsd: Number(p.price_usd),
    stock: Number(p.stock ?? 0),
    category: p.category,
    imageUrl: p.image_url ?? undefined,
    tags: p.tags ?? undefined,
  };
}
export function mapRider(r: any): Rider {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    reliabilityPercent: Number(r.reliability_percent ?? 0),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    earningsTodayUsd: Number(r.earnings_today_usd ?? 0),
    suspended: !!r.suspended,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
  };
}
export function mapOrderRow(o: any): Order {
  return {
    id: o.id,
    customerId: o.customer_id,
    restaurantId: o.restaurant_id ?? undefined,
    riderId: o.rider_id ?? undefined,
    items: [], // filled later
    subtotalUsd: Number(o.subtotal_usd),
    deliveryFeeUsd: Number(o.delivery_fee_usd),
    totalUsd: Number(o.total_usd),
    address: o.address,
    addressNotes: o.address_notes ?? undefined,
    customerPhone: o.customer_phone ?? undefined,
    zone: o.zone,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status === "paid" ? "paid" : "unpaid",
    status: o.status,
    pin: o.pin,
    createdAt: new Date(o.created_at).getTime(),
    updatedAt: new Date(o.updated_at).getTime(),
    rating:
      o.rating_stars != null
        ? {
            stars: Number(o.rating_stars) as 1 | 2 | 3 | 4 | 5,
            comment: o.rating_comment ?? undefined,
            createdAt: o.rating_created_at ? new Date(o.rating_created_at).getTime() : Date.now(),
          }
        : undefined,
    supportNotes: undefined, // filled later
    commissionUsd: o.commission_usd != null ? Number(o.commission_usd) : undefined,
    riderEarningUsd: o.rider_earning_usd != null ? Number(o.rider_earning_usd) : undefined,
    vatUsd: o.vat_usd != null ? Number(o.vat_usd) : undefined,
    deliveryLat: o.delivery_lat ?? undefined,
    deliveryLng: o.delivery_lng ?? undefined,
    cancelReason: o.cancel_reason ?? undefined,
    cancelledBy: o.cancelled_by ?? undefined,
    refundFlag: !!o.refund_flag,
    refundNote: o.refund_note ?? undefined,
    prepMinutes: o.prep_minutes ?? undefined,
    acceptedAt: o.accepted_at ? new Date(o.accepted_at).getTime() : undefined,
    deliveredAt: o.delivered_at ? new Date(o.delivered_at).getTime() : undefined,
    riderPaidAt: o.rider_paid_at ? new Date(o.rider_paid_at).getTime() : undefined,
  };
}
function mapRiderPayout(row: any): RiderPayout {
  return {
    id: row.id,
    riderId: row.rider_id,
    amountUsd: Number(row.amount_usd),
    orderIds: Array.isArray(row.order_ids) ? row.order_ids : [],
    phone: row.phone,
    provider: row.provider,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    paidAt: row.paid_at ? new Date(row.paid_at).getTime() : undefined,
  };
}
function mapSupportRequest(row: any): SupportRequest {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role,
    topic: row.topic,
    message: row.message,
    orderId: row.order_id ?? undefined,
    priority: row.priority,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
function mapOrderItem(i: any): OrderItem {
  return {
    id: i.id,
    kind: i.kind,
    restaurantId: i.restaurant_id ?? undefined,
    menuItemId: i.menu_item_id ?? undefined,
    productId: i.product_id ?? undefined,
    name: i.name,
    quantity: Number(i.quantity),
    unitPriceUsd: Number(i.unit_price_usd),
    imageUrl: i.image_url ?? undefined,
  };
}
function mapSupportNote(n: any): SupportNote {
  return {
    id: n.id,
    orderId: n.order_id,
    note: n.note,
    createdBy: n.created_by,
    createdAt: new Date(n.created_at).getTime(),
  };
}
function mapUserRow(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    merchantId: u.merchant_id ?? undefined,
    riderId: u.rider_id ?? undefined,
  };
}


// ---- Rider state (restored from the database on every load) ----
export type RiderActiveJob = {
  id: string;
  status: OrderStatus;
  address: string;
  addressNotes?: string;
  customerPhone?: string;
  zone: string;
  pickupName: string;
  pickupZone: string;
  items: { name: string; quantity: number; imageUrl?: string }[];
  totalUsd: number;
  paymentMethod: PaymentMethod;
  earningsUsd: number;
  deliveryFeeUsd: number;
  pickupLat: number;
  pickupLon: number;
};

export type RiderState = {
  riderId: string;
  name: string;
  status: RiderStatus;
  earningsTodayUsd: number;
  activeOrder: RiderActiveJob | null;
};

const RIDER_ACTIVE: OrderStatus[] = [
  "rider_assigned",
  "going_to_restaurant",
  "arrived",
  "picked_up",
  "delivering",
  "arrived_at_customer",
];

export async function getRiderState(riderId: string): Promise<RiderState> {
  let rider: Rider | undefined;
  if (!supabaseConfigured()) {
    rider = memory.listRiders().find((r) => r.id === riderId);
  } else {
    const supabase = getServiceClient();
    const r = await supabase.from("riders").select("*").eq("id", riderId).maybeSingle();
    if (r.error) throw r.error;
    rider = r.data ? mapRider(r.data) : undefined;
  }
  const orders = await listOrdersForRider(riderId);
  const active = orders
    .filter((o) => RIDER_ACTIVE.includes(o.status))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  let activeOrder: RiderActiveJob | null = null;
  if (active) {
    const rest = active.restaurantId ? await getRestaurant(active.restaurantId) : undefined;
    activeOrder = {
      id: active.id,
      status: active.status,
      address: active.address,
      addressNotes: active.addressNotes,
      customerPhone: active.customerPhone,
      zone: active.zone,
      pickupName: rest?.name ?? "Dépôt Trouvailles",
      pickupZone: rest?.zone ?? "Gombe",
      pickupLat: rest?.latitude ?? HUB.lat,
      pickupLon: rest?.longitude ?? HUB.lon,
      items: active.items.map((i) => ({ name: i.name, quantity: i.quantity, imageUrl: i.imageUrl })),
      totalUsd: active.totalUsd,
      paymentMethod: active.paymentMethod,
      deliveryFeeUsd: active.deliveryFeeUsd,
      earningsUsd: estimateEarningsUsd(active),
    };
  }
  let status: RiderStatus = rider?.status ?? "offline";
  if (activeOrder) status = "busy";
  else if (status === "busy") {
    // Stale "busy" with no delivery in progress: repair so offers can arrive again
    await setRiderStatus(riderId, "online");
    status = "online";
  }
  return {
    riderId,
    name: rider?.name ?? "Livreur",
    status,
    earningsTodayUsd: summarizeRiderEarnings(orders, "today").earned,
    activeOrder,
  };
}

/** Dish count per restaurant (admin overview). */
export async function countMenuItemsByRestaurant(): Promise<Record<string, { total: number; available: number }>> {
  const out: Record<string, { total: number; available: number }> = {};
  let rows: { restaurantId: string; available: boolean }[] = [];
  if (!supabaseConfigured()) {
    const rests = memory.getRestaurants();
    rows = rests.flatMap((r) => memory.getMenuForRestaurant(r.id).map((m) => ({ restaurantId: m.restaurantId, available: m.available })));
  } else {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("menu_items").select("restaurant_id,available");
    if (error) throw error;
    rows = (data || []).map((m: any) => ({ restaurantId: m.restaurant_id, available: !!m.available }));
  }
  for (const r of rows) {
    const c = (out[r.restaurantId] ||= { total: 0, available: 0 });
    c.total++;
    if (r.available) c.available++;
  }
  return out;
}
