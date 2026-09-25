import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  listOrdersForCustomer,
  listOrdersForRestaurant,
  listOrdersForRider,
  listOrdersAll,
} from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import { OrderItem, PaymentMethod } from "@/src/lib/types";

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
  const body = await req.json();
  const {
    restaurantId,
    items,
    address,
    zone,
    paymentMethod,
  }: {
    restaurantId?: string;
    items: OrderItem[];
    address: string;
    zone?: string;
    paymentMethod: PaymentMethod;
  } = body;
  if (!items?.length) {
    return NextResponse.json({ error: "missing_items" }, { status: 400 });
  }
  try {
    const order = await createOrder({
      customerId: user.id,
      restaurantId,
      items,
      address,
      zone,
      paymentMethod,
    });
    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (["invalid_item", "unavailable_item", "invalid_restaurant_item"].includes(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

