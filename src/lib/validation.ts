import { z } from "zod";
import { normalizeDrcPhone } from "./phone";
import type { OrderStatus } from "./types";

/** Zones Apporte actually serves today. Checkout only offers these. */
export const SERVED_ZONES = ["Gombe"] as const;

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
  zone: (typeof SERVED_ZONES)[number];
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

  const zone = b.zone == null || b.zone === "" ? "Gombe" : b.zone;
  if (typeof zone !== "string" || !(SERVED_ZONES as readonly string[]).includes(zone)) {
    return { ok: false, error: "bad_request", reason: "zone_not_served", field: "zone" };
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
      zone: zone as CreateOrderInput["zone"],
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
  z.object({
    action: z.literal("support_note"),
    note: z.string().trim().min(1).max(500),
    by: z.string().optional(),
  }),
]);

export const dispatchPostSchema = z.object({
  action: z.enum(["accept", "decline", "going", "arrived", "picked_up", "delivering", "delivered"]),
  orderId: id,
  pin: z.string().trim().regex(/^\d{4}$/).optional(),
  riderId: z.string().optional(),
});

export const riderStatusSchema = z.object({ status: z.enum(["offline", "online"]) });
