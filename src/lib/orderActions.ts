import { getCurrentUser } from "./auth";
import { getOrder, merchantAccept, merchantSetPreparing, merchantSetReady } from "./data/db";
import { checkMerchantAction, type GuardResult, type MerchantAction } from "./orderGuard";

/**
 * Advance an order as the signed-in merchant. The only entry point for
 * merchant transitions (API route and server action both call this).
 */
export async function advanceOrderAsMerchant(orderId: unknown, action: unknown): Promise<GuardResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, error: "unauthorized" };
  if (typeof orderId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    return { ok: false, status: 400, error: "invalid_order_id" };
  }
  // Role check before touching the order, so non-merchants learn nothing about it.
  if (user.role !== "merchant" || !user.merchantId) return { ok: false, status: 403, error: "forbidden" };
  const order = await getOrder(orderId);
  const res = checkMerchantAction(user, order, action);
  if (!res.ok) return res;
  switch (action as MerchantAction) {
    case "merchant_accept":
      await merchantAccept(orderId);
      break;
    case "merchant_preparing":
      await merchantSetPreparing(orderId);
      break;
    case "merchant_ready":
      await merchantSetReady(orderId);
      break;
  }
  return { ok: true };
}
