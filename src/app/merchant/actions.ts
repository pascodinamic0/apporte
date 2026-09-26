"use server";
import { revalidatePath } from "next/cache";
import { advanceOrderAsMerchant } from "@/src/lib/orderActions";

export type AdvanceResult = { ok: true } | { ok: false; error: string };

/**
 * Server actions are public POST endpoints: every call re-checks the session,
 * the merchant role, restaurant ownership and the current order status
 * (same guard as PATCH /api/orders/:id).
 */
export async function advanceOrder(orderId: string, action: string): Promise<AdvanceResult> {
  const res = await advanceOrderAsMerchant(orderId, action);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/merchant");
  return { ok: true };
}
