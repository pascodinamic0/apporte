import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  listOrdersForCustomer,
  listOrdersForRestaurant,
  listOrdersForRider,
  listOrdersAll,
} from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import type { OrderItem } from "@/src/lib/types";
import { validateCreateOrder } from "@/src/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ orders: [] });
  let orders = [] as Awaited<ReturnType<typeof listOrdersForCustomer>>;
  if (user.role === "merchant" && user.merchantId) {
    orders = await listOrdersForRestaurant(user.merchantId);
  } else if (user.role === "rider" && user.riderId) {
    orders = await listOrdersForRider(user.riderId);
  } else if (user.role === "admin") {
    orders = await listOrdersAll();
  } else {
    orders = await listOrdersForCustomer(user.id);
  }
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "customer") {
    return NextResponse.json({ error: "forbidden", reason: "customers_only" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const v = validateCreateOrder(body);
  if (!v.ok) {
    return NextResponse.json({ error: v.error, reason: v.reason, field: v.field }, { status: 400 });
  }
  try {
    const order = await createOrder({
      customerId: user.id,
      restaurantId: v.data.restaurantId,
      items: v.data.items as OrderItem[],
      address: v.data.address,
      addressNotes: v.data.addressNotes,
      customerPhone: v.data.customerPhone,
      zone: v.data.zone,
      paymentMethod: v.data.paymentMethod,
    });
    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (["invalid_item", "unavailable_item", "invalid_restaurant_item"].includes(msg)) {
      return NextResponse.json({ error: msg, reason: msg }, { status: 400 });
    }
    console.error("createOrder failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
