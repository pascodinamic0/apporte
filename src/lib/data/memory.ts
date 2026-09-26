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
import {
  PILOT_ZONE,
  demoUsers,
  menuItems as seedMenu,
  restaurants as seedRestaurants,
  riders as seedRiders,
  smartFinds as seedProducts,
} from "../seed";
import { generatePin, randomId } from "../utils";

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
    { riderIds: string[]; currentIndex: number; expireAt?: number }
  >(), // per-order queue for offers
  };
}
const g = globalThis as typeof globalThis & { __apporteMemoryDb?: ReturnType<typeof createMemoryDb> };
const db = (g.__apporteMemoryDb ??= createMemoryDb());

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
export function setRiderStatus(riderId: string, status: RiderStatus) {
  const r = db.riders.find((x) => x.id === riderId);
  if (r) r.status = status;
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
  return [...db.orders].sort((a, b) => b.createdAt - a.createdAt);
}
export function listOrdersForRestaurant(restaurantId: string): Order[] {
  return db.orders
    .filter((o) => o.restaurantId === restaurantId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function listOrdersForRider(riderId: string): Order[] {
  return db.orders
    .filter((o) => o.riderId === riderId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function listOrdersForCustomer(customerId: string): Order[] {
  return db.orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function getOrder(id: string): Order | undefined {
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
  const items: OrderItem[] = params.items.map((it) => {
    if (it.kind === "food" && it.menuItemId) {
      const m = db.menuItems.find((x) => x.id === it.menuItemId);
      if (!m) throw new Error("invalid_item");
      if (!m.available) throw new Error("unavailable_item");
      if (params.restaurantId && m.restaurantId !== params.restaurantId) throw new Error("invalid_restaurant_item");
      return { id: randomId("oi"), kind: "food", restaurantId: m.restaurantId, menuItemId: m.id, name: m.name, quantity: Number(it.quantity || 1), unitPriceUsd: m.priceUsd, imageUrl: m.imageUrl };
    }
    if (it.kind === "smart_find" && it.productId) {
      const p = db.products.find((x) => x.id === it.productId);
      if (!p) throw new Error("invalid_item");
      return { id: randomId("oi"), kind: "smart_find", productId: p.id, name: p.name, quantity: Number(it.quantity || 1), unitPriceUsd: p.priceUsd, imageUrl: p.imageUrl };
    }
    throw new Error("invalid_item");
  });
  const subtotal = items.reduce((sum, it) => sum + it.unitPriceUsd * it.quantity, 0);
  const deliveryFee = params.restaurantId ? 2.5 : 3; // simple heuristic
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
    status: params.restaurantId ? "placed" : "rider_searching",
    pin,
    createdAt: now,
    updatedAt: now,
    supportNotes: [],
  };
  db.orders.unshift(order);
  if (!params.restaurantId) buildOfferQueueForOrder(order);
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
}

export function setOrderRating(orderId: string, stars: 1 | 2 | 3 | 4 | 5, comment?: string) {
  const o = getOrder(orderId);
  if (!o) return;
  o.rating = { stars, comment, createdAt: Date.now() };
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
  return sn;
}

// Dispatch
export function nextOfferForRider(riderId: string) {
  // Return the next active offer for this rider if any
  const online = db.riders.find((r) => r.id === riderId && r.status === "online");
  if (!online) return null;
  // Find any order in rider_searching whose queue currently points to riderId
  for (const o of db.orders) {
    if (o.status !== "rider_searching") continue;
    const q = db.offerQueues.get(o.id);
    if (!q) continue;
    const currentRiderId = q.riderIds[q.currentIndex];
    if (currentRiderId === riderId) {
      const offer = buildOffer(o.id, riderId);
      // set expire in ~30 seconds
      q.expireAt = Date.now() + 30_000;
      return offer;
    }
  }
  return null;
}

export function declineOffer(riderId: string, orderId: string) {
  const q = db.offerQueues.get(orderId);
  if (!q) return;
  // advance index only if current offered rider equals this rider
  const current = q.riderIds[q.currentIndex];
  if (current === riderId) {
    q.currentIndex = Math.min(q.currentIndex + 1, q.riderIds.length - 1);
    q.expireAt = undefined;
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
  return true;
}

export function confirmPickup(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "picked_up";
  o.updatedAt = Date.now();
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
    r.earningsTodayUsd += estimateEarningsUsd(o);
  }
  return { ok: true as const };
}

export function progressToGoing(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "going_to_restaurant";
  o.updatedAt = Date.now();
  return true;
}
export function progressToArrived(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "arrived";
  o.updatedAt = Date.now();
  return true;
}
export function progressToDelivering(riderId: string, orderId: string) {
  const o = getOrder(orderId);
  if (!o || o.riderId !== riderId) return false;
  o.status = "delivering";
  o.updatedAt = Date.now();
  return true;
}

export function merchantAccept(orderId: string) {
  const o = getOrder(orderId);
  if (!o) return false;
  o.status = "restaurant_accepted";
  o.updatedAt = Date.now();
  return true;
}
export function merchantSetPreparing(orderId: string) {
  const o = getOrder(orderId);
  if (!o) return false;
  o.status = "preparing";
  o.updatedAt = Date.now();
  return true;
}
export function merchantSetReady(orderId: string) {
  const o = getOrder(orderId);
  if (!o) return false;
  o.status = "rider_searching";
  o.updatedAt = Date.now();
  buildOfferQueueForOrder(o);
  return true;
}

// Helpers
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function estimateEarningsUsd(order: Order): number {
  // naive split: 70% of delivery fee to rider
  return round2(order.deliveryFeeUsd * 0.7);
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function buildOffer(orderId: string, riderId: string) {
  const o = getOrder(orderId)!;
  const rest = o.restaurantId ? getRestaurant(o.restaurantId) : undefined;
  const rider = db.riders.find((r) => r.id === riderId)!;
  const pickupDistance = rest
    ? haversineKm(rider.latitude, rider.longitude, rest.latitude, rest.longitude)
    : 1.2;
  const deliveryDistance = 2.1; // mock
  const eta = Math.round(pickupDistance * 6 + deliveryDistance * 6 + 6); // minutes heuristic
  return {
    orderId,
    riderId,
    pickupDistanceKm: round2(pickupDistance),
    deliveryDistanceKm: deliveryDistance,
    etaMinutes: eta,
    earningsUsd: estimateEarningsUsd(o),
    expiresAt: Date.now() + 30_000,
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
          : 1 + Math.random();
      // score: lower pickup distance (higher score), higher reliability
      const score = 100 - pickup * 10 + r.reliabilityPercent * 0.1;
      return { riderId: r.id, pickup, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.riderId);
  db.offerQueues.set(order.id, { riderIds: ranked, currentIndex: 0 });
}

// Demo accounts (read-only accessor)
export function getDemoUsers() {
  return demoUsers;
}

