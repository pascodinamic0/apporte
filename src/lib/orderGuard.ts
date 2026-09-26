import type { Order, OrderStatus, User } from "./types";

/** Merchant transitions: action -> required current status -> next status. */
export const MERCHANT_TRANSITIONS = {
  merchant_accept: { from: "placed", to: "restaurant_accepted" },
  merchant_preparing: { from: "restaurant_accepted", to: "preparing" },
  merchant_ready: { from: "preparing", to: "rider_searching" },
} as const satisfies Record<string, { from: OrderStatus; to: OrderStatus }>;

export type MerchantAction = keyof typeof MERCHANT_TRANSITIONS;

export function isMerchantAction(a: unknown): a is MerchantAction {
  return typeof a === "string" && Object.prototype.hasOwnProperty.call(MERCHANT_TRANSITIONS, a);
}

export type GuardResult =
  | { ok: true }
  | { ok: false; status: 400 | 401 | 403 | 404 | 409; error: string };

/**
 * Pure authorization check shared by PATCH /api/orders/:id and the merchant
 * server action. Session, role, ownership and state are all enforced here.
 */
export function checkMerchantAction(
  user: Pick<User, "role" | "merchantId"> | null | undefined,
  order: Pick<Order, "restaurantId" | "status"> | null | undefined,
  action: unknown,
): GuardResult {
  if (!user) return { ok: false, status: 401, error: "unauthorized" };
  if (!isMerchantAction(action)) return { ok: false, status: 400, error: "unknown_action" };
  if (user.role !== "merchant" || !user.merchantId) return { ok: false, status: 403, error: "forbidden" };
  if (!order) return { ok: false, status: 404, error: "not_found" };
  if (!order.restaurantId || order.restaurantId !== user.merchantId) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  if (order.status !== MERCHANT_TRANSITIONS[action].from) {
    return { ok: false, status: 409, error: "invalid_state" };
  }
  return { ok: true };
}

/** Rider step transitions: action -> required current status. */
export const RIDER_STEP_FROM: Record<"going" | "arrived" | "picked_up" | "delivering" | "delivered", OrderStatus> = {
  going: "rider_assigned",
  arrived: "going_to_restaurant",
  picked_up: "arrived",
  delivering: "picked_up",
  delivered: "delivering",
};

export const RIDER_ACTIVE_STATUSES: OrderStatus[] = [
  "rider_assigned",
  "going_to_restaurant",
  "arrived",
  "picked_up",
  "delivering",
];
