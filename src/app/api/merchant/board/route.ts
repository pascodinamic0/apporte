import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { getRestaurant, listOrdersForRestaurant, listRiders } from "@/src/lib/data/db";
import { toBoardOrder } from "@/src/app/merchant/board-types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "merchant" || !user.merchantId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [restaurant, orders, riders] = await Promise.all([
    getRestaurant(user.merchantId),
    listOrdersForRestaurant(user.merchantId),
    listRiders(),
  ]);
  const riderName = new Map(riders.map((r) => [r.id, r.name]));
  return NextResponse.json(
    {
      restaurant,
      orders: orders.slice(0, 120).map((o) => toBoardOrder(o, riderName)),
      at: Date.now(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
