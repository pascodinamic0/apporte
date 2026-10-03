import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { createSupportRequest, getOrder, getRiderState } from "@/src/lib/data/db";
import { supportRequestSchema } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

/** Rider (or any signed-in user) opens a support request an admin can see. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = supportRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request", reason: "invalid_body" }, { status: 400 });
  }
  let orderId = parsed.data.orderId;
  if (orderId) {
    const order = await getOrder(orderId);
    const owns =
      !!order &&
      (order.customerId === user.id ||
        (user.role === "rider" && user.riderId && order.riderId === user.riderId) ||
        (user.role === "merchant" && user.merchantId && order.restaurantId === user.merchantId) ||
        user.role === "admin");
    if (!owns) orderId = undefined;
  }
  if (!orderId && user.role === "rider" && user.riderId) {
    const state = await getRiderState(user.riderId);
    orderId = state.activeOrder?.id;
  }
  const row = await createSupportRequest({
    userId: user.id,
    userName: user.name,
    role: user.role,
    topic: parsed.data.topic,
    message: parsed.data.message,
    orderId,
    priority: parsed.data.priority,
  });
  return NextResponse.json({ ok: true, id: row.id });
}
