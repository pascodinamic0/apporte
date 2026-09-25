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
} from "../types";
import { PILOT_ZONE } from "../seed";
import { generatePin, randomId } from "../utils";
import { getServiceClient } from "../supabase/server";

// Restaurants
export async function getRestaurants(): Promise<Restaurant[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("is_open", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRestaurant);
}

export async function getRestaurant(id: string): Promise<Restaurant | undefined> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("restaurants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRestaurant(data) : undefined;
}

export async function getMenuForRestaurant(restaurantId: string): Promise<MenuItem[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMenuItem);
}

// Catalog
export async function listSmartFinds(): Promise<SmartFindProduct[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("smart_find_products").select("*").order("name");
  if (error) throw error;
  return (data || []).map(mapProduct);
}

// Riders
export async function listRiders(): Promise<Rider[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("riders").select("*").order("name");
  if (error) throw error;
  return (data || []).map(mapRider);
}

export async function setRiderStatus(riderId: string, status: RiderStatus) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("riders").update({ status }).eq("id", riderId);
  if (error) throw error;
}

// Menu admin
export async function toggleMenuItemAvailability(menuItemId: string, available: boolean) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("menu_items").update({ available }).eq("id", menuItemId);
  if (error) throw error;
}
export async function updateMenuItemPrice(menuItemId: string, priceUsd: number) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ price_usd: priceUsd })
    .eq("id", menuItemId);
  if (error) throw error;
}

// Orders
export async function listOrdersAll(): Promise<Order[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await attachItemsAndNotes((data || []).map(mapOrderRow));
}
export async function listOrdersForRestaurant(restaurantId: string): Promise<Order[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await attachItemsAndNotes((data || []).map(mapOrderRow));
}
export async function listOrdersForRider(riderId: string): Promise<Order[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await attachItemsAndNotes((data || []).map(mapOrderRow));
}
export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await attachItemsAndNotes((data || []).map(mapOrderRow));
}
export async function getOrder(id: string): Promise<Order | undefined> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const base = mapOrderRow(data);
  // Lazily advance expired dispatch offers
  if (base.status === "rider_searching") {
    await maybeAdvanceOfferQueue(base.id);
  }
  const [itemsRes, notesRes, menuLookup] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
    supabase
      .from("support_notes")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("menu_items").select("id,image_url"),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (notesRes.error) throw notesRes.error;
  base.items = (itemsRes.data || []).map(mapOrderItem);
  // Backfill missing images from current menu data
  const menuById = new Map<string, string>();
  if (!menuLookup.error) {
    for (const m of menuLookup.data || []) {
      if ((m as any).id) menuById.set((m as any).id, (m as any).image_url || null);
    }
  }
  base.items = base.items.map((it) => ({
    ...it,
    imageUrl: it.imageUrl || (it.menuItemId ? menuById.get(it.menuItemId) || undefined : it.imageUrl),
  }));
  const notes = (notesRes.data || []).map(mapSupportNote);
  base.supportNotes = notes.length ? notes : undefined;
  return base;
}

export async function createOrder(params: {
  customerId: string;
  restaurantId?: string;
  items: OrderItem[];
  address: string;
  zone?: string;
  paymentMethod: PaymentMethod;
}): Promise<Order> {
  const supabase = getServiceClient();
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

  const serverItems = params.items.map((it) => {
    if (it.kind === "food" && it.menuItemId) {
      const m = menuById.get(it.menuItemId);
      if (!m) throw new Error("invalid_item");
      if (m.available === false) throw new Error("unavailable_item");
      // Enforce restaurant if provided
      if (params.restaurantId && m.restaurant_id !== params.restaurantId) throw new Error("invalid_restaurant_item");
      return {
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
      };
    }
    if (it.kind === "smart_find" && it.productId) {
      const p = prodById.get(it.productId);
      if (!p) throw new Error("invalid_item");
      return {
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
      };
    }
    throw new Error("invalid_item");
  });

  const subtotal = serverItems.reduce((sum, it) => sum + it.unit_price_usd * it.quantity, 0);
  const deliveryFee = params.restaurantId ? 2.5 : 3;
  const pin = generatePin(4);
  const now = Date.now();
  const id = randomId("ord");
  const orderRow = {
    id,
    customer_id: params.customerId,
    restaurant_id: params.restaurantId ?? null,
    rider_id: null,
    subtotal_usd: round2(subtotal),
    delivery_fee_usd: deliveryFee,
    total_usd: round2(subtotal + deliveryFee),
    address: params.address,
    zone: params.zone ?? PILOT_ZONE,
    payment_method: params.paymentMethod,
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
  // Insert items with server-computed prices
  const itemRows = serverItems.map((row) => ({ ...row, order_id: id }));
  const insItems = await supabase.from("order_items").insert(itemRows);
  if (insItems.error) {
    await supabase.from("orders").delete().eq("id", id);
    throw insItems.error;
  }
  // If Smart Finds (no restaurant), immediately build the rider offer queue
  if (!params.restaurantId) {
    const fullNow = await getOrder(id);
    if (fullNow) {
      await buildOfferQueueForOrder(fullNow);
    }
  }
  // Return assembled
  const full = await getOrder(id);
  if (!full) throw new Error("Order creation failed");
  return full;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (status === "rider_searching" && data) {
    const order = mapOrderRow(data);
    await buildOfferQueueForOrder(order);
  }
}

export async function setOrderRating(
  orderId: string,
  stars: 1 | 2 | 3 | 4 | 5,
  comment?: string,
) {
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
export async function nextOfferForRider(riderId: string) {
  const supabase = getServiceClient();
  // Ensure rider is online
  const rres = await supabase.from("riders").select("*").eq("id", riderId).maybeSingle();
  if (rres.error) throw rres.error;
  const rider = rres.data ? mapRider(rres.data) : undefined;
  if (!rider || rider.status !== "online") return null;
  // Candidate orders
  const ores = await supabase
    .from("orders")
    .select("*")
    .eq("status", "rider_searching")
    .order("created_at", { ascending: true });
  if (ores.error) throw ores.error;
  const qres = await supabase.from("dispatch_queues").select("*");
  if (qres.error) throw qres.error;
  const dqByOrder = new Map<string, any>((qres.data || []).map((q) => [q.order_id, q]));
  for (const row of ores.data || []) {
    const o = mapOrderRow(row);
    let q = dqByOrder.get(o.id);
    if (!q) {
      // Repair missing queue lazily
      await buildOfferQueueForOrder(o);
      const fresh = await supabase.from("dispatch_queues").select("*").eq("order_id", o.id).maybeSingle();
      if (!fresh.error && fresh.data) q = fresh.data;
      else continue;
    }
    // If expired or pointing to an offline rider, advance lazily
    const now = Date.now();
    let idx = Math.max(0, q.current_index ?? 0);
    let riderIds: string[] = Array.isArray(q.rider_ids) ? q.rider_ids : [];
    const current: string | undefined = riderIds[idx];
    // Helper: ensure current index points to an online rider
    async function normalizeIndex(startIndex: number) {
      if (!riderIds.length) {
        // Rebuild from scratch when queue is empty
        await buildOfferQueueForOrder(o);
        const fresh = await supabase.from("dispatch_queues").select("*").eq("order_id", o.id).maybeSingle();
        if (!fresh.error && fresh.data) {
          riderIds = fresh.data.rider_ids || [];
          idx = Math.max(0, fresh.data.current_index ?? 0);
        }
      }
      let tries = 0;
      let i = startIndex;
      while (tries < Math.max(1, riderIds.length)) {
        const rid = riderIds[i];
        if (rid) {
          const rr = await supabase.from("riders").select("status").eq("id", rid).maybeSingle();
          if (!rr.error && rr.data && rr.data.status === "online") {
            return i;
          }
        }
        i = (i + 1) % Math.max(1, riderIds.length);
        tries++;
      }
      return startIndex;
    }
    const isExpired = q.expire_at ? new Date(q.expire_at).getTime() <= now : true;
    if (isExpired || !current) {
      idx = await normalizeIndex((idx + 1) % Math.max(1, riderIds.length || 1));
      await supabase
        .from("dispatch_queues")
        .update({ current_index: idx, expire_at: new Date(Date.now() + 30_000).toISOString(), updated_at: new Date().toISOString() })
        .eq("order_id", o.id);
      // Reload queue state after advancement
      const re = await supabase.from("dispatch_queues").select("*").eq("order_id", o.id).maybeSingle();
      if (!re.error && re.data) {
        q = re.data;
        riderIds = Array.isArray(q.rider_ids) ? q.rider_ids : [];
        idx = Math.max(0, q.current_index ?? 0);
      }
    }
    const currentRiderId: string | undefined = (riderIds[idx] ?? riderIds[0]) as string | undefined;
    if (currentRiderId === riderId) {
      const offer = await buildOffer(o.id, riderId);
      // Do NOT touch expire_at on polling; it must not reset
      return offer;
    }
  }
  return null;
}

export async function declineOffer(riderId: string, orderId: string) {
  const supabase = getServiceClient();
  const qres = await supabase.from("dispatch_queues").select("*").eq("order_id", orderId).maybeSingle();
  if (qres.error) throw qres.error;
  const q = qres.data;
  if (!q) return;
  const idx = q.current_index ?? 0;
  const current: string | undefined = q.rider_ids?.[idx];
  if (current === riderId) {
    const nextIndex = Math.min(idx + 1, Math.max(0, (q.rider_ids?.length ?? 1) - 1));
    await supabase
      .from("dispatch_queues")
      .update({ current_index: nextIndex, expire_at: null, updated_at: new Date().toISOString() })
      .eq("order_id", orderId);
  }
}

export async function acceptOffer(riderId: string, orderId: string) {
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
  return true;
}

export async function confirmPickup(riderId: string, orderId: string) {
  const supabase = getServiceClient();
  const ores = await supabase.from("orders").select("rider_id").eq("id", orderId).maybeSingle();
  if (ores.error) throw ores.error;
  if (!ores.data || ores.data.rider_id !== riderId) return false;
  const { error } = await supabase
    .from("orders")
    .update({ status: "picked_up", updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
  return true;
}

export async function confirmDelivered(riderId: string, orderId: string, enteredPin: string) {
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
    .update({ status: "delivered", updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
  // Update rider earnings and status
  const earn = estimateEarningsUsd(o);
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
  return { ok: true as const };
}

export async function progressToGoing(riderId: string, orderId: string) {
  return await guardRiderProgress(riderId, orderId, "going_to_restaurant");
}
export async function progressToArrived(riderId: string, orderId: string) {
  return await guardRiderProgress(riderId, orderId, "arrived");
}
export async function progressToDelivering(riderId: string, orderId: string) {
  return await guardRiderProgress(riderId, orderId, "delivering");
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
  return true;
}

export async function merchantAccept(orderId: string) {
  await updateOrderStatus(orderId, "restaurant_accepted");
  return true;
}
export async function merchantSetPreparing(orderId: string) {
  await updateOrderStatus(orderId, "preparing");
  return true;
}
export async function merchantSetReady(orderId: string) {
  await updateOrderStatus(orderId, "rider_searching");
  return true;
}

// Demo users accessor
export async function getDemoUsers() {
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
function estimateEarningsUsd(order: Order): number {
  return round2(order.deliveryFeeUsd * 0.7);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg: number) {
  return (deg * Math.PI) / 180;
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
  // Pickup distance: restaurant when available; Smart Finds hub otherwise
  // Smart Finds hub (Kinshasa, Gombe) — approximate coordinates
  const HUB_LAT = -4.312;
  const HUB_LON = 15.31;
  let pickupDistance = 1.2;
  if (o.restaurantId) {
    const rest = await getRestaurant(o.restaurantId);
    if (rest) {
      pickupDistance = haversineKm(rider.latitude, rider.longitude, rest.latitude, rest.longitude);
    }
  } else {
    pickupDistance = haversineKm(rider.latitude, rider.longitude, HUB_LAT, HUB_LON);
  }
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
  let pickupName = "Dépôt Smart Finds";
  let pickupZone = "Gombe";
  if (o.restaurantId) {
    const rest = await getRestaurant(o.restaurantId);
    if (rest) {
      pickupName = rest.name;
      pickupZone = rest.zone;
    }
  }
  const deliveryDistance = 2.1;
  const eta = Math.round(pickupDistance * 6 + deliveryDistance * 6 + 6);
  return {
    orderId,
    riderId,
    pickupDistanceKm: round2(pickupDistance),
    deliveryDistanceKm: deliveryDistance,
    etaMinutes: eta,
    earningsUsd: estimateEarningsUsd(o),
    expiresAt: Date.now() + 30_000,
    // Enriched fields for rider offer card
    deliveryAddress: o.address,
    deliveryZone: o.zone,
    firstItemName,
    firstItemImageUrl,
    pickupName,
    pickupZone,
  };
}

async function buildOfferQueueForOrder(order: Order) {
  const supabase = getServiceClient();
  const rest = order.restaurantId ? await getRestaurant(order.restaurantId) : undefined;
  // Smart Finds hub when no restaurant
  const HUB_LAT = -4.312;
  const HUB_LON = 15.31;
  const { data, error } = await supabase.from("riders").select("*").eq("status", "online");
  if (error) throw error;
  const eligible = (data || []).map(mapRider);
  const ranked = eligible
    .map((r) => {
      const pickup =
        rest?.latitude && rest.longitude
          ? haversineKm(r.latitude, r.longitude, rest.latitude, rest.longitude)
          : haversineKm(r.latitude, r.longitude, HUB_LAT, HUB_LON);
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
        expire_at: new Date(Date.now() + 30_000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_id" },
    );
}

// Advance to next rider if current offer expired or invalid. Called on reads.
async function maybeAdvanceOfferQueue(orderId: string) {
  const supabase = getServiceClient();
  const qres = await supabase.from("dispatch_queues").select("*").eq("order_id", orderId).maybeSingle();
  if (qres.error) return;
  const q = qres.data;
  if (!q) {
    // Repair missing queue lazily
    const ores = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!ores.error && ores.data) {
      await buildOfferQueueForOrder(mapOrderRow(ores.data));
    }
    return;
  }
  const now = Date.now();
  const isExpired = !q.expire_at || new Date(q.expire_at).getTime() <= now;
  let riderIds: string[] = Array.isArray(q.rider_ids) ? q.rider_ids : [];
  if (!isExpired && riderIds.length) return;
  let idx = (q.current_index ?? 0) + 1;
  if (riderIds.length) idx = idx % riderIds.length;
  await supabase
    .from("dispatch_queues")
    .update({ current_index: idx, expire_at: new Date(Date.now() + 30_000).toISOString(), updated_at: new Date().toISOString() })
    .eq("order_id", orderId);
}

async function attachItemsAndNotes(orders: Order[]): Promise<Order[]> {
  if (orders.length === 0) return [];
  const supabase = getServiceClient();
  const ids = orders.map((o) => o.id);
  const [itemsRes, notesRes] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", ids).order("created_at"),
    supabase.from("support_notes").select("*").in("order_id", ids).order("created_at"),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (notesRes.error) throw notesRes.error;
  const itemsByOrder = new Map<string, any[]>();
  for (const it of itemsRes.data || []) {
    const arr = itemsByOrder.get(it.order_id) || [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
  }
  const notesByOrder = new Map<string, any[]>();
  for (const n of notesRes.data || []) {
    const arr = notesByOrder.get(n.order_id) || [];
    arr.push(n);
    notesByOrder.set(n.order_id, arr);
  }
  return orders.map((o) => {
    const its = (itemsByOrder.get(o.id) || []).map(mapOrderItem);
    const nts = (notesByOrder.get(o.id) || []).map(mapSupportNote);
    return { ...o, items: its, supportNotes: nts.length ? nts : undefined };
  });
}

// Row -> type mappers
function mapRestaurant(r: any): Restaurant {
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
    isOpen: !!r.is_open,
  };
}
function mapMenuItem(m: any): MenuItem {
  return {
    id: m.id,
    restaurantId: m.restaurant_id,
    name: m.name,
    description: m.description ?? undefined,
    priceUsd: Number(m.price_usd),
    available: !!m.available,
    imageUrl: m.image_url ?? undefined,
    cuisineTag: m.cuisine_tag ?? undefined,
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
function mapRider(r: any): Rider {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    reliabilityPercent: Number(r.reliability_percent ?? 0),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    earningsTodayUsd: Number(r.earnings_today_usd ?? 0),
  };
}
function mapOrderRow(o: any): Order {
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
    zone: o.zone,
    paymentMethod: o.payment_method,
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

