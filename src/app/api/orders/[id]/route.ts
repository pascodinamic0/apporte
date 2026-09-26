import { NextRequest, NextResponse } from "next/server";
import { addSupportNote, getOrder, setOrderRating, updateOrderStatus } from "@/src/lib/data/db";
import { advanceOrderAsMerchant } from "@/src/lib/orderActions";
import { isMerchantAction } from "@/src/lib/orderGuard";
import { orderPatchSchema } from "@/src/lib/validation";
import { getCurrentUser } from "@/src/lib/auth";
import { getServiceClient } from "@/src/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const isCustomer = !!user && user.id === order.customerId;
  const isAdmin = user?.role === "admin";
  const isMerchant = user?.role === "merchant" && user.merchantId && user.merchantId === order.restaurantId;
  const isAssignedRider = user?.role === "rider" && user.riderId && user.riderId === order.riderId;
  let isCurrentOfferHolder = false;
  if (user?.role === "rider" && user.riderId && order.status === "rider_searching") {
    const supabase = getServiceClient();
    const q = await supabase.from("dispatch_queues").select("*").eq("order_id", order.id).maybeSingle();
    if (!q.error && q.data) {
      const idx = Math.max(0, q.data.current_index ?? 0);
      const rid = (Array.isArray(q.data.rider_ids) ? q.data.rider_ids[idx] : undefined) as string | undefined;
      const notExpired = q.data.expire_at && new Date(q.data.expire_at).getTime() > Date.now();
      isCurrentOfferHolder = notExpired && rid === user.riderId;
    }
  }
  if (!isCustomer && !isAdmin && !isMerchant && !isAssignedRider && !isCurrentOfferHolder) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // Strip PIN for non-owners; a rider who only holds the offer does not get the phone yet
  if (!isCustomer) {
    const { pin, ...rest } = order;
    if (!isAdmin && !isMerchant && !isAssignedRider) {
      delete rest.customerPhone;
      delete rest.addressNotes;
    }
    return NextResponse.json({ order: rest });
  }
  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || !("action" in raw) || !(raw as { action?: unknown }).action) {
    return NextResponse.json({ error: "bad_request", reason: "missing_action" }, { status: 400 });
  }
  const parsed = orderPatchSchema.safeParse(raw);
  if (!parsed.success) {
    const action = String((raw as { action?: unknown }).action);
    const known = ["update_status", "merchant_accept", "merchant_preparing", "merchant_ready", "rate", "support_note"];
    const reason = !known.includes(action)
      ? "unknown_action"
      : action === "rate"
        ? "invalid_rating"
        : "invalid_body";
    return NextResponse.json({ error: "bad_request", reason }, { status: 400 });
  }
  const body = parsed.data;

  // Merchant transitions go through the single guarded entry point.
  if (isMerchantAction(body.action)) {
    const res = await advanceOrderAsMerchant(id, body.action);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    const updated = await getOrder(id);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { pin, ...rest } = updated;
    return NextResponse.json({ ok: true, order: rest });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const isAdmin = user.role === "admin";
  const isCustomer = user.id === order.customerId;
  const isMerchant = user.role === "merchant" && !!user.merchantId && user.merchantId === order.restaurantId;
  const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (body.action === "update_status") {
    if (!isAdmin) return forbidden();
    await updateOrderStatus(id, body.status);
  } else if (body.action === "rate") {
    if (!isCustomer) return forbidden();
    if (order.status !== "delivered") {
      return NextResponse.json({ error: "conflict", reason: "not_delivered" }, { status: 409 });
    }
    if (order.rating?.stars != null) {
      return NextResponse.json({ error: "conflict", reason: "already_rated" }, { status: 409 });
    }
    await setOrderRating(id, body.rating as 1 | 2 | 3 | 4 | 5, body.comment || undefined);
  } else if (body.action === "support_note") {
    if (!isAdmin && !isMerchant) return forbidden();
    await addSupportNote(id, body.note, user.id);
  }
  const updated = await getOrder(id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Strip PIN for non-owners
  if (!isCustomer) {
    const { pin, ...rest } = updated;
    return NextResponse.json({ ok: true, order: rest });
  }
  return NextResponse.json({ ok: true, order: updated });
}
