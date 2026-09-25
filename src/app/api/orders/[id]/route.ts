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
  const isRider = user?.role === "rider" && user.riderId && user.riderId === order.riderId;
  if (!isCustomer && !isAdmin && !isMerchant && !isRider) {
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
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const isAdmin = user?.role === "admin";
  const isCustomer = user?.id === order.customerId;
  const isMerchant = user?.role === "merchant" && user.merchantId && user.merchantId === order.restaurantId;
  const isRider = user?.role === "rider" && user.riderId && user.riderId === order.riderId;

  function badAuth() {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
    await setOrderRating(id, rating, comment);
  } else if (action === "support_note" && note && by) {
    if (!isAdmin && !isMerchant) return badAuth();
    await addSupportNote(id, note, user?.id || "system");
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

