import { z } from "zod";
import { normalizeDrcPhone } from "./phone";
import type { OrderStatus } from "./types";

/** Zones Apporte serves by default. The live list (and fees) comes from the zones table, editable in admin. */
export const SERVED_ZONES = ["Gombe"] as const;
/** Kinshasa bounding box for map pins. */
export const KINSHASA_BOUNDS = { minLat: -4.75, maxLat: -4.0, minLng: 15.0, maxLng: 15.75 };

/** Payment methods that really work today (no online payment is taken yet). */
export const ACTIVE_PAYMENT_METHODS = ["Cash on delivery"] as const;
/** Methods known to the data model but not live yet. */
export const UPCOMING_PAYMENT_METHODS = ["Mobile Money", "Card"] as const;

export const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "restaurant_accepted",
  "preparing",
  "rider_searching",
  "rider_assigned",
  "going_to_restaurant",
  "arrived",
  "picked_up",
  "delivering",
  "arrived_at_customer",
  "delivered",
  "cancelled",
];

const id = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

const cartItem = z
  .object({
    kind: z.enum(["food", "smart_find"]),
    menuItemId: id.optional(),
    productId: id.optional(),
    quantity: z.coerce.number().int().min(1).max(20),
  })
  .passthrough()
  .refine((i) => (i.kind === "food" ? !!i.menuItemId : !!i.productId), {
    message: "missing_item_ref",
  });

export type ValidationFailure = { ok: false; error: string; reason: string; field?: string };
export type ValidationSuccess<T> = { ok: true; data: T };

export type CreateOrderInput = {
  restaurantId?: string;
  items: { kind: "food" | "smart_find"; menuItemId?: string; productId?: string; quantity: number }[];
  address: string;
  addressNotes?: string;
  zone: string;
  deliveryLat?: number;
  deliveryLng?: number;
  paymentMethod: (typeof ACTIVE_PAYMENT_METHODS)[number];
  customerPhone: string;
};

/**
 * Validate the body of POST /api/orders. Never throws; returns a 400-ready
 * reason code the UI maps to a French message.
 */
export function validateCreateOrder(body: unknown): ValidationSuccess<CreateOrderInput> | ValidationFailure {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "bad_request", reason: "invalid_body" };
  }
  const b = body as Record<string, unknown>;

  // Payment method first: a clear reason for "not available yet" vs garbage.
  const pm = b.paymentMethod;
  if (typeof pm !== "string" || !pm) {
    return { ok: false, error: "bad_request", reason: "invalid_payment_method", field: "paymentMethod" };
  }
  if ((UPCOMING_PAYMENT_METHODS as readonly string[]).includes(pm)) {
    return { ok: false, error: "bad_request", reason: "payment_method_unavailable", field: "paymentMethod" };
  }
  if (!(ACTIVE_PAYMENT_METHODS as readonly string[]).includes(pm)) {
    return { ok: false, error: "bad_request", reason: "invalid_payment_method", field: "paymentMethod" };
  }

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return { ok: false, error: "missing_items", reason: "missing_items", field: "items" };
  }
  if (b.items.length > 50) {
    return { ok: false, error: "bad_request", reason: "too_many_items", field: "items" };
  }
  const items = z.array(cartItem).safeParse(b.items);
  if (!items.success) {
    return { ok: false, error: "bad_request", reason: "invalid_items", field: "items" };
  }

  const phone = normalizeDrcPhone(b.customerPhone);
  if (!phone) {
    return { ok: false, error: "bad_request", reason: "invalid_phone", field: "customerPhone" };
  }

  const address = typeof b.address === "string" ? b.address.trim() : "";
  if (address.length < 5 || address.length > 200) {
    return { ok: false, error: "bad_request", reason: "invalid_address", field: "address" };
  }

  let addressNotes: string | undefined;
  if (b.addressNotes != null && b.addressNotes !== "") {
    if (typeof b.addressNotes !== "string" || b.addressNotes.trim().length > 300) {
      return { ok: false, error: "bad_request", reason: "invalid_address_notes", field: "addressNotes" };
    }
    addressNotes = b.addressNotes.trim() || undefined;
  }

  // Zone must be a plain name; whether it is served (and its fee) is checked against the zones table.
  const zone = b.zone == null || b.zone === "" ? "Gombe" : b.zone;
  if (typeof zone !== "string" || !/^[\p{L} '’-]{2,40}$/u.test(zone)) {
    return { ok: false, error: "bad_request", reason: "zone_not_served", field: "zone" };
  }

  let deliveryLat: number | undefined;
  let deliveryLng: number | undefined;
  if (b.deliveryLat != null || b.deliveryLng != null) {
    const pin = parsePin(b.deliveryLat, b.deliveryLng);
    if (!pin) return { ok: false, error: "bad_request", reason: "invalid_pin", field: "deliveryLat" };
    deliveryLat = pin.lat;
    deliveryLng = pin.lng;
  }

  let restaurantId: string | undefined;
  if (b.restaurantId != null && b.restaurantId !== "") {
    const r = id.safeParse(b.restaurantId);
    if (!r.success) return { ok: false, error: "bad_request", reason: "invalid_restaurant", field: "restaurantId" };
    restaurantId = r.data;
  }

  return {
    ok: true,
    data: {
      restaurantId,
      items: items.data.map((i) => ({
        kind: i.kind,
        menuItemId: i.menuItemId,
        productId: i.productId,
        quantity: i.quantity,
      })),
      address,
      addressNotes,
      zone,
      deliveryLat,
      deliveryLng,
      paymentMethod: pm as CreateOrderInput["paymentMethod"],
      customerPhone: phone,
    },
  };
}

export { parseMenuPrice } from "./price";

export const menuPatchSchema = z
  .object({
    available: z.boolean().optional(),
    priceUsd: z.unknown().optional(),
  })
  .strict();

export const orderPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update_status"), status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]) }),
  z.object({ action: z.literal("merchant_accept") }),
  z.object({ action: z.literal("merchant_preparing") }),
  z.object({ action: z.literal("merchant_ready") }),
  z.object({
    action: z.literal("rate"),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional(),
  }),
  z.object({ action: z.literal("merchant_accept_prep"), prepMinutes: z.coerce.number().int().min(5).max(90) }),
  z.object({ action: z.literal("merchant_reject"), reason: z.string().trim().min(2).max(200) }),
  z.object({ action: z.literal("customer_cancel"), reason: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("admin_cancel"), reason: z.string().trim().min(2).max(200) }),
  z.object({ action: z.literal("admin_reassign"), riderId: id.nullable() }),
  z.object({ action: z.literal("admin_refund"), flag: z.boolean(), note: z.string().trim().max(300).optional() }),
  z.object({
    action: z.literal("support_note"),
    note: z.string().trim().min(1).max(500),
    by: z.string().optional(),
  }),
  z.object({
    action: z.literal("rider_payout"),
    paid: z.boolean(),
  }),
]);

export const dispatchPostSchema = z.object({
  action: z.enum(["accept", "decline", "going", "arrived", "picked_up", "delivering", "at_customer", "delivered"]),
  orderId: id,
  pin: z.string().trim().regex(/^\d{4}$/).optional(),
  riderId: z.string().optional(),
});

export const supportRequestSchema = z.object({
  topic: z.string().trim().min(3).max(80),
  message: z.string().trim().min(10).max(1500),
  orderId: id.optional(),
  priority: z.enum(["normal", "urgent"]).default("normal"),
});

export const supportStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

export const riderStatusSchema = z.object({ status: z.enum(["offline", "online"]) });

/** A map pin inside Kinshasa, rounded to ~1 m. */
export function parsePin(latRaw: unknown, lngRaw: unknown): { lat: number; lng: number } | null {
  const lat = typeof latRaw === "string" ? Number(latRaw) : latRaw;
  const lng = typeof lngRaw === "string" ? Number(lngRaw) : lngRaw;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const B = KINSHASA_BOUNDS;
  if (lat < B.minLat || lat > B.maxLat || lng < B.minLng || lng > B.maxLng) return null;
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
}

const money = z.coerce.number().finite().min(0.1).max(500).transform((n) => Math.round(n * 100) / 100);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((u) => u === "" || u.startsWith("/images/") || /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//.test(u), "bad_image_url")
  .optional()
  .nullable();

export const menuItemCreateSchema = z
  .object({
    name: text(2, 80),
    description: z.string().trim().max(300).optional().nullable(),
    priceUsd: money,
    category: text(2, 30),
    available: z.boolean().default(true),
    imageUrl,
  })
  .strict();

export const menuItemUpdateSchema = z
  .object({
    name: text(2, 80).optional(),
    description: z.string().trim().max(300).optional().nullable(),
    priceUsd: money.optional(),
    category: text(2, 30).optional(),
    available: z.boolean().optional(),
    imageUrl,
  })
  .strict();

export const restaurantOpenSchema = z
  .object({
    acceptingOrders: z.boolean().optional(),
    hours: z.array(z.object({ open: z.string(), close: z.string(), closed: z.boolean() })).length(7).optional(),
  })
  .strict();

export const restaurantAdminSchema = z
  .object({
    name: text(2, 60),
    description: z.string().trim().max(300).optional().nullable(),
    cuisine: text(2, 40),
    zone: text(2, 40),
    etaMinutes: z.coerce.number().int().min(5).max(120),
    imageUrl,
    latitude: z.coerce.number().min(KINSHASA_BOUNDS.minLat).max(KINSHASA_BOUNDS.maxLat),
    longitude: z.coerce.number().min(KINSHASA_BOUNDS.minLng).max(KINSHASA_BOUNDS.maxLng),
    commissionPct: z.coerce.number().min(0).max(100).optional().nullable(),
    phone: z.string().trim().max(20).optional().nullable(),
    suspended: z.boolean().optional(),
  })
  .strict();

export const riderAdminSchema = z
  .object({
    name: text(2, 60),
    phone: z.string().trim().max(20).optional().nullable(),
    suspended: z.boolean().optional(),
  })
  .strict();

export const zoneSchema = z
  .object({
    id: id.optional(),
    name: z.string().trim().regex(/^[\p{L} '’-]{2,40}$/u),
    deliveryFeeUsd: z.coerce.number().finite().min(0).max(20).transform((n) => Math.round(n * 100) / 100),
    active: z.boolean(),
  })
  .strict();

export const addressSchema = z
  .object({
    id: id.optional(),
    label: text(1, 30),
    address: text(5, 200),
    notes: z.string().trim().max(300).optional().nullable(),
    zone: z.string().trim().regex(/^[\p{L} '’-]{2,40}$/u).default("Gombe"),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    isDefault: z.boolean().default(false),
  })
  .strict();

export const CANCEL_REASONS = [
  "Rupture de stock",
  "Trop de commandes",
  "Fermeture imminente",
  "Adresse hors zone",
  "Autre",
] as const;
