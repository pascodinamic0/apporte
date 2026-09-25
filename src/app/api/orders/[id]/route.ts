import { NextRequest, NextResponse } from "next/server";
import {
  addSupportNote,
  getOrder,
  merchantAccept,
  merchantSetPreparing,
  merchantSetReady,
  setOrderRating,
  updateOrderStatus,
} from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import { getServiceClient } from "@/src/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const user = await getCurrentUser();
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
  // Strip PIN for non-owners
  if (!isCustomer) {
    const { pin, ...rest } = order as any;
    return NextResponse.json({ order: rest });
  }
  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await req.json().catch(() => ({}));
  const { action, status, rating, comment, note, by } = body;
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const isAdmin = user.role === "admin";
  const isCustomer = user.id === order.customerId;
  const isMerchant = user.role === "merchant" && user.merchantId && user.merchantId === order.restaurantId;
  const isAssignedRider = user.role === "rider" && user.riderId && user.riderId === order.riderId;
  let isCurrentOfferHolder = false;
  if (user.role === "rider" && user.riderId && order.status === "rider_searching") {
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

  function badAuth() {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!action) {
    return NextResponse.json({ error: "bad_request", reason: "missing_action" }, { status: 400 });
  }

  if (action === "update_status" && status) {
    if (!isAdmin) return badAuth();
    await updateOrderStatus(id, status);
  } else if (action === "merchant_accept") {
    if (!isMerchant || order.status !== "placed") return badAuth();
    await merchantAccept(id);
  } else if (action === "merchant_preparing") {
    if (!isMerchant || order.status !== "restaurant_accepted") return badAuth();
    await merchantSetPreparing(id);
  } else if (action === "merchant_ready") {
    if (!isMerchant || order.status !== "preparing") return badAuth();
    await merchantSetReady(id);
  } else if (action === "rate" && rating) {
    if (!isCustomer) return badAuth();
    // Accept only whole numbers 1..5
    const rNum = Number(rating);
    if (!Number.isInteger(rNum) || rNum < 1 || rNum > 5) {
      return NextResponse.json({ error: "bad_request", reason: "invalid_rating" }, { status: 400 });
    }
    // Only after delivery
    if (order.status !== "delivered") {
      return NextResponse.json({ error: "conflict", reason: "not_delivered" }, { status: 409 });
    }
    // Only once
    if (order.rating?.stars != null) {
      return NextResponse.json({ error: "conflict", reason: "already_rated" }, { status: 409 });
    }
    await setOrderRating(id, rNum as 1 | 2 | 3 | 4 | 5, comment);
  } else if (action === "support_note" && note && by) {
    if (!isAdmin && !isMerchant) return badAuth();
    await addSupportNote(id, note, user?.id || "system");
  } else {
    return NextResponse.json({ error: "bad_request", reason: "unknown_action" }, { status: 400 });
  }
  const updated = await getOrder(id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Strip PIN for non-owners
  if (!isCustomer) {
    const { pin, ...rest } = updated as any;
    return NextResponse.json({ ok: true, order: rest });
  }
  return NextResponse.json({ ok: true, order: updated });
}

