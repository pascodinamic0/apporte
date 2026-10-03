import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_FEES, DEFAULT_ZONES, computeBreakdown, zoneFee } from "../fees";
import {
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Restaurant,
  Rider,
  RiderPayout,
  RiderStatus,
  SmartFindProduct,
  SupportNote,
  SupportRequest,
  SupportRequestStatus,
} from "../types";
import { markRiderPresent, riderIsPresent, stepDispatchQueue } from "../dispatch";
import { riderEarningsUsd } from "../earnings";
import { HUB, OFFER_LEASE_MS, deliveryLegKm, haversineKm, quoteDeliveryFeeUsd } from "../geo";
import {
  PILOT_ZONE,
  demoUsers,
  menuItems as seedMenu,
  restaurants as seedRestaurants,
  riders as seedRiders,
  smartFinds as seedProducts,
} from "../seed";
import { lockedPayoutOrderIds, mobileMoneyProvider, selectWithdrawable } from "../payouts";
import { normalizeDrcPhone } from "../phone";
import { generatePin, randomId } from "../utils";
import { CatalogError } from "../catalogError";

// In-memory "DB" for demo mode. Kept on globalThis so route handlers, server
// components and server actions (bundled separately by Next) share one store.
function createMemoryDb() {
  return {
  restaurants: [...seedRestaurants] as Restaurant[],
  menuItems: [...seedMenu] as MenuItem[],
  products: [...seedProducts] as SmartFindProduct[],
  riders: [...seedRiders] as Rider[],
  orders: [] as Order[],
  offerQueues: new Map<
    string,
    { riderIds: string[]; currentIndex: number; expireAt?: number; closed?: boolean }
  >(), // per-order queue for offers
  supportRequests: [] as SupportRequest[],
  payouts: [] as RiderPayout[],
  };
}
const g = globalThis as typeof globalThis & { __apporteMemoryDb?: ReturnType<typeof createMemoryDb> };
const db = (g.__apporteMemoryDb ??= createMemoryDb());

// Demo mode has no database. Orders are written to disk so a dev-server
// restart does not drop a client's history. Live in-memory orders are merged
// in and never replaced by an older copy.
const ORDERS_FILE = path.join(process.cwd(), ".data", "orders.json");
let ordersFileMtime = 0;

function readOrdersFile(): { orders: Order[]; mtime: number } | null {
  try {
    const st = statSync(ORDERS_FILE);
    const parsed = JSON.parse(readFileSync(ORDERS_FILE, "utf8")) as { orders?: Order[] };
    if (!Array.isArray(parsed.orders)) return null;
    return { orders: parsed.orders.filter((o) => o && typeof o.id === "string"), mtime: st.mtimeMs };
  } catch {
    return null;
  }
}

function syncOrders() {
  const disk = readOrdersFile();
  if (!disk || disk.mtime === ordersFileMtime) return;
  // The file is the full set. Merging would put a deleted course back and offer it again.
  const next = [...disk.orders].sort((a, b) => b.createdAt - a.createdAt);
  db.orders.splice(0, db.orders.length, ...next);
  const live = new Set(next.filter((o) => o.status === "rider_searching").map((o) => o.id));
  for (const id of db.offerQueues.keys()) {
    if (!live.has(id)) db.offerQueues.delete(id);
  }
  ordersFileMtime = disk.mtime;
}

const PAYOUTS_FILE = path.join(process.cwd(), ".data", "payouts.json");
const payoutsState = globalThis as typeof globalThis & { __apportePayoutsReady?: boolean };

function loadPayouts() {
  if (payoutsState.__apportePayoutsReady) return;
  payoutsState.__apportePayoutsReady = true;
  try {
    const parsed = JSON.parse(readFileSync(PAYOUTS_FILE, "utf8")) as { payouts?: RiderPayout[] };
    if (!Array.isArray(parsed.payouts)) return;
    const rows = parsed.payouts.filter((p) => p && typeof p.id === "string" && typeof p.riderId === "string");
    db.payouts.splice(0, db.payouts.length, ...rows);
  } catch {
    // No file yet: the in-memory list is the store.
  }
}

function savePayouts() {
  try {
    mkdirSync(path.dirname(PAYOUTS_FILE), { recursive: true });
    const tmp = `${PAYOUTS_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify({ payouts: db.payouts }));
    renameSync(tmp, PAYOUTS_FILE);
  } catch (err) {
    console.error("persist payouts failed", err);
  }
}

function saveOrders() {
  try {
    mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
    const tmp = `${ORDERS_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify({ orders: db.orders }));
    renameSync(tmp, ORDERS_FILE);
    ordersFileMtime = statSync(ORDERS_FILE).mtimeMs;
  } catch (err) {
    console.error("persist orders failed", err);
  }
}

// Seed contact fields added after the process started: fill them without wiping live orders.
if (!db.supportRequests) db.supportRequests = [];
for (const seed of seedRiders) {
  const rider = db.riders.find((r) => r.id === seed.id);
  if (!rider) continue;
  if (!rider.phone && seed.phone) rider.phone = seed.phone;
  if (!rider.email && seed.email) rider.email = seed.email;
}
syncOrders();
saveOrders();
if (!db.payouts) db.payouts = [];
loadPayouts();

export function isDemoMode(): boolean {
  return !(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getRestaurants(): Restaurant[] {
  return db.restaurants.filter((r) => r.isOpen);
}
export function getRestaurant(id: string): Restaurant | undefined {
  return db.restaurants.find((r) => r.id === id);
}
export function getMenuForRestaurant(restaurantId: string): MenuItem[] {
  return db.menuItems.filter((m) => m.restaurantId === restaurantId);
}
export function listSmartFinds(): SmartFindProduct[] {
  return db.products;
}
export function listRiders(): Rider[] {
  return db.riders;
}
export function getRider(id: string): Rider | undefined {
  return db.riders.find((r) => r.id === id);
}
export function getUserForRider(riderId: string) {
  return demoUsers.find((u) => u.riderId === riderId);
}
export function setRiderStatus(riderId: string, status: RiderStatus) {
  const r = db.riders.find((x) => x.id === riderId);
  if (r) r.status = status;
  if (status === "offline") {
    const now = Date.now();
    for (const q of db.offerQueues.values()) {
      if (q.riderIds[q.currentIndex] === riderId) q.expireAt = now;
    }
  }
}

export function toggleMenuItemAvailability(menuItemId: string, available: boolean) {
  const m = db.menuItems.find((x) => x.id === menuItemId);
  if (m) m.available = available;
}
export function updateMenuItemPrice(menuItemId: string, priceUsd: number) {
  const m = db.menuItems.find((x) => x.id === menuItemId);
  if (m) m.priceUsd = priceUsd;
}

export function listOrdersAll(): Order[] {
  syncOrders();
  return [...db.orders].sort((a, b) => b.createdAt - a.createdAt);
}
export function listOrdersForRestaurant(restaurantId: string): Order[] {
  syncOrders();
  return db.orders
    .filter((o) => o.restaurantId === restaurantId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function listOrdersForRider(riderId: string): Order[] {
  syncOrders();
  return db.orders
    .filter((o) => o.riderId === riderId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function listOrdersForCustomer(customerId: string): Order[] {
  syncOrders();
  return db.orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function getOrder(id: string): Order | undefined {
  syncOrders();
  return db.orders.find((o) => o.id === id);
}

export function createOrder(params: {
  customerId: string;
  restaurantId?: string;
  items: OrderItem[];
  address: string;
  addressNotes?: string;
  customerPhone?: string;
  zone?: string;
  paymentMethod: PaymentMethod;
}): Order {
  // Recompute names and prices from the catalogue (never trust the client)
  const unavailableNames: string[] = [];
  const items: OrderItem[] = [];
  for (const it of params.items) {
    if (it.kind === "food" && it.menuItemId) {
      const m = db.menuItems.find((x) => x.id === it.menuItemId);
      if (!m) throw new CatalogError("invalid_item");
      if (!m.available) {
        unavailableNames.push(m.name);
        continue;
      }
      if (params.restaurantId && m.restaurantId !== params.restaurantId) throw new CatalogError("invalid_restaurant_item");
      items.push({ id: randomId("oi"), kind: "food", restaurantId: m.restaurantId, menuItemId: m.id, name: m.name, quantity: Number(it.quantity || 1), unitPriceUsd: m.priceUsd, imageUrl: m.imageUrl });
      continue;
    }
    if (it.kind === "smart_find" && it.productId) {
      const p = db.products.find((x) => x.id === it.productId);
      if (!p) throw new CatalogError("invalid_item");
      items.push({ id: randomId("oi"), kind: "smart_find", productId: p.id, name: p.name, quantity: Number(it.quantity || 1), unitPriceUsd: p.priceUsd, imageUrl: p.imageUrl });
      continue;
    }
    throw new CatalogError("invalid_item");
  }
  if (unavailableNames.length) throw new CatalogError("unavailable_item", unavailableNames);
  const subtotal = items.reduce((sum, it) => sum + it.unitPriceUsd * it.quantity, 0);
  const deliveryFee = zoneFee(DEFAULT_ZONES, params.zone ?? PILOT_ZONE) ?? DEFAULT_ZONES[0].deliveryFeeUsd;
  const bd = computeBreakdown(subtotal, deliveryFee, DEFAULT_FEES);
  const pin = generatePin(4);
  const now = Date.now();
  const order: Order = {
    id: randomId("ord"),
    customerId: params.customerId,
    restaurantId: params.restaurantId,
    riderId: undefined,
    items,
    subtotalUsd: round2(subtotal),
    deliveryFeeUsd: deliveryFee,
    totalUsd: round2(subtotal + deliveryFee),
    address: params.address,
    addressNotes: params.addressNotes,
    customerPhone: params.customerPhone,
    zone: params.zone ?? PILOT_ZONE,
    paymentMethod: params.paymentMethod,
    paymentStatus: "unpaid",
    status: params.restaurantId ? "placed" : "rider_searching",
    pin,
    createdAt: now,
    updatedAt: now,
    supportNotes: [],
    commissionUsd: bd.commissionUsd,
    riderEarningUsd: bd.riderEarningUsd,
    vatUsd: bd.vatUsd,
  };
  syncOrders();
  db.orders.unshift(order);
  if (!params.restaurantId) buildOfferQueueForOrder(order);
  saveOrders();
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const o = getOrder(orderId);
  if (!o) return;
  o.status = status;
  o.updatedAt = Date.now();
  if (status === "rider_searching") {
    buildOfferQueueForOrder(o);
  }
  saveOrders();
}

export function setOrderRating(orderId: string, stars: 1 | 2 | 3 | 4 | 5, comment?: string) {
  const o = getOrder(orderId);
  if (!o) return;
  o.rating = { stars, comment, createdAt: Date.now() };
  saveOrders();
}

export function createSupportRequest(input: Omit<SupportRequest, "id" | "createdAt" | "updatedAt" | "status"> & { status?: SupportRequestStatus }): SupportRequest {
  const now = Date.now();
  const row: SupportRequest = {
    id: randomId("sup"),
    status: input.status ?? "open",
    createdAt: now,
    updatedAt: now,
    userId: input.userId,
    userName: input.userName,
    role: input.role,
    topic: input.topic,
    message: input.message,
    orderId: input.orderId,
    priority: input.priority,
  };
  db.supportRequests.unshift(row);
  return row;
}

export function listSupportRequests(): SupportRequest[] {
  return [...db.supportRequests].sort((a, b) => b.createdAt - a.createdAt);
}

export function setSupportRequestStatus(id: string, status: SupportRequestStatus): SupportRequest | undefined {
  const row = db.supportRequests.find((r) => r.id === id);
  if (!row) return undefined;
  row.status = status;
  row.updatedAt = Date.now();
  return row;
}

export function setRiderPayout(orderId: string, paid: boolean): boolean {
  const o = getOrder(orderId);
  if (!o || o.status !== "delivered") return false;
  o.riderPaidAt = paid ? Date.now() : undefined;
  o.updatedAt = Date.now();
  saveOrders();
  if (paid) closeCoveredPayouts();
  return true;
}

export function listRiderPayouts(riderId?: string): RiderPayout[] {
  loadPayouts();
  const rows = riderId ? db.payouts.filter((p) => p.riderId === riderId) : db.payouts;
  return [...rows].sort((a, b) => b.createdAt - a.createdAt);
}

export function createRiderPayout(
  riderId: string,
  phone: string,
): { ok: true; payout: RiderPayout } | { ok: false; reason: "invalid_phone" | "nothing_to_withdraw" } {
  const normalized = normalizeDrcPhone(phone);
  if (!normalized) return { ok: false, reason: "invalid_phone" };
  const network = mobileMoneyProvider(normalized);
  if (!network) return { ok: false, reason: "invalid_phone" };
  syncOrders();
  loadPayouts();
  const mine = db.orders.filter((o) => o.riderId === riderId);
  const { orderIds, amountUsd } = selectWithdrawable(mine, lockedPayoutOrderIds(db.payouts.filter((p) => p.riderId === riderId)));
  if (!orderIds.length || amountUsd <= 0) return { ok: false, reason: "nothing_to_withdraw" };
  const now = Date.now();
  const payout: RiderPayout = {
    id: randomId("pay"),
    riderId,
    amountUsd,
    orderIds,
    phone: normalized,
    provider: network.provider,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  };
  db.payouts.unshift(payout);
  savePayouts();
  return { ok: true, payout };
}

export function settleRiderPayout(
  id: string,
  action: "pay" | "reject",
): RiderPayout | undefined {
  loadPayouts();
  const payout = db.payouts.find((p) => p.id === id);
  if (!payout || payout.status !== "requested") return undefined;
  const now = Date.now();
  if (action === "pay") {
    for (const orderId of payout.orderIds) {
      const o = getOrder(orderId);
      if (!o || o.status !== "delivered") continue;
      o.riderPaidAt = o.riderPaidAt ?? now;
      o.updatedAt = now;
    }
    saveOrders();
    payout.status = "paid";
    payout.paidAt = now;
  } else {
    payout.status = "rejected";
  }
  payout.updatedAt = now;
  savePayouts();
  return payout;
}

function closeCoveredPayouts() {
  loadPayouts();
  const paid = new Set(db.orders.filter((o) => o.riderPaidAt).map((o) => o.id));
  let changed = false;
  const now = Date.now();
  for (const p of db.payouts) {
    if (p.status !== "requested" || p.orderIds.length === 0) continue;
    if (!p.orderIds.every((id) => paid.has(id))) continue;
    p.status = "paid";
    p.paidAt = now;
    p.updatedAt = now;
    changed = true;
  }
  if (changed) savePayouts();
}

export function addSupportNote(orderId: string, note: string, createdBy: string): SupportNote {
  const o = getOrder(orderId);
  if (!o) throw new Error("Order not found");
  const sn: SupportNote = {
    id: randomId("note"),
    orderId,
    note,
    createdBy,
    createdAt: Date.now(),
  };
  o.supportNotes = o.supportNotes ?? [];
  o.supportNotes.push(sn);
  o.updatedAt = Date.now();
  saveOrders();
  return sn;
}

// Dispatch
export function nextOfferForRider(riderId: string, skip: Set<string> = new Set()) {
  syncOrders();
  const online = db.riders.find((r) => r.id === riderId && r.status === "online");
  if (!online) return null;
  const now = Date.now();
  markRiderPresent(riderId, now);
  const onlineIds = new Set(db.riders.filter((r) => r.status === "online").map((r) => r.id));
  for (const o of db.orders) {
    if (o.status !== "rider_searching") continue;
    const q = db.offerQueues.get(o.id);
    // A queue exists only because this order just became searchable. Never invent one on read:
    // that is what made old courses reappear as new ones after a reload.
    if (!q || q.closed) continue;
    for (const id of onlineIds) {
      if (!q.riderIds.includes(id)) q.riderIds.push(id);
    }
    const step = stepDispatchQueue(
      q,
      riderId,
      { now, online: onlineIds, declined: skip.has(o.id), present: (id) => riderIsPresent(id, now) },
    );
    q.currentIndex = step.currentIndex;
    q.expireAt = step.expireAt;
    if (step.closed) q.closed = true;
    if (step.offer && step.expireAt) return buildOffer(o.id, riderId, step.expireAt);
  }
  return null;
}

export function declineOffer(riderId: string, orderId: string) {
  const q = db.offerQueues.get(orderId);
  if (!q) return;
  const current = q.riderIds[q.currentIndex];
  if (current === riderId) {
    const moved = nextOnlineForward(q.riderIds, q.currentIndex + 1, new Set(db.riders.filter((r) => r.status === "online").map((r) => r.id)));
    if (moved == null) q.closed = true;
    else {
      q.currentIndex = moved;
      q.expireAt = Date.now() + OFFER_LEASE_MS;
    }
  }
}

export function acceptOffer(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.status !== "rider_searching") return false;
  const q = db.offerQueues.get(orderId);
  if (!q) return false;
  const current = q.riderIds[q.currentIndex];
  if (current !== riderId) return false;
  // Assign
  o.riderId = riderId;
  o.status = "rider_assigned";
  o.updatedAt = Date.now();
  const r = db.riders.find((x) => x.id === riderId);
  if (r) r.status = "busy";
  saveOrders();
  return true;
}

export function confirmPickup(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "picked_up";
  o.updatedAt = Date.now();
  saveOrders();
  return true;
}

export function confirmDelivered(riderId: string, orderId: string, enteredPin: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return { ok: false, reason: "not_found" as const };
  if (o.pin !== enteredPin) return { ok: false, reason: "bad_pin" as const };
  o.status = "delivered";
  o.updatedAt = Date.now();
  const r = db.riders.find((x) => x.id === riderId);
  if (r) {
    r.status = "online";
    r.earningsTodayUsd += riderEarningsUsd(o.deliveryFeeUsd);
  }
  saveOrders();
  return { ok: true as const };
}

export function progressToGoing(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "going_to_restaurant";
  o.updatedAt = Date.now();
  saveOrders();
  return true;
}
export function progressToArrived(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "arrived";
  o.updatedAt = Date.now();
  saveOrders();
  return true;
}
export function progressToDelivering(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "delivering";
  o.updatedAt = Date.now();
  saveOrders();
  return true;
}
export function progressToCustomer(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "arrived_at_customer";
  o.updatedAt = Date.now();
  saveOrders();
  return true;
}

export function merchantAccept(orderId: string) {
  const o = getOrder(orderId);
  if (!o) return false;
  o.status = "restaurant_accepted";
  o.updatedAt = Date.now();
  saveOrders();
  return true;
}
export function merchantSetPreparing(orderId: string) {
  const o = getOrder(orderId);
  if (!o) return false;
  o.status = "preparing";
  o.updatedAt = Date.now();
  saveOrders();
  return true;
}
export function merchantSetReady(orderId: string) {
  const o = getOrder(orderId);
  if (!o) return false;
  o.status = "rider_searching";
  o.updatedAt = Date.now();
  buildOfferQueueForOrder(o);
  saveOrders();
  return true;
}

// Helpers
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function buildOffer(orderId: string, riderId: string, expiresAt: number) {
  const o = getOrder(orderId)!;
  const rest = o.restaurantId ? getRestaurant(o.restaurantId) : undefined;
  const rider = db.riders.find((r) => r.id === riderId)!;
  const pickupLat = rest?.latitude ?? HUB.lat;
  const pickupLon = rest?.longitude ?? HUB.lon;
  const pickupDistance = haversineKm(rider.latitude, rider.longitude, pickupLat, pickupLon);
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
    expiresAt,
    deliveryAddress: o.address,
    deliveryZone: o.zone,
    firstItemName: o.items[0]?.name,
    firstItemImageUrl: o.items[0]?.imageUrl,
    pickupName: rest?.name ?? "Dépôt Trouvailles Apporte",
    pickupZone: rest?.zone ?? o.zone,
  };
}

function buildOfferQueueForOrder(order: Order) {
  const rest = order.restaurantId ? getRestaurant(order.restaurantId) : undefined;
  const eligible = db.riders.filter((r) => r.status === "online");
  const ranked = eligible
    .map((r) => {
      const pickup =
        rest?.latitude && rest.longitude
          ? haversineKm(r.latitude, r.longitude, rest.latitude, rest.longitude)
          : haversineKm(r.latitude, r.longitude, HUB.lat, HUB.lon);
      // score: lower pickup distance (higher score), higher reliability
      const score = 100 - pickup * 10 + r.reliabilityPercent * 0.1;
      return { riderId: r.id, pickup, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.riderId);
  db.offerQueues.set(order.id, { riderIds: ranked, currentIndex: 0, expireAt: Date.now() + OFFER_LEASE_MS });
}

/** Next online rider after `start`, without wrapping back to the start of the list. */
function nextOnlineForward(riderIds: string[], start: number, online: Set<string>): number | null {
  for (let i = start; i < riderIds.length; i++) {
    if (online.has(riderIds[i])) return i;
  }
  return null;
}

// Demo accounts (read-only accessor)
export function getDemoUsers() {
  return demoUsers;
}

