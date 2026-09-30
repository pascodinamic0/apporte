import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { getMenuForRestaurant, getOrder, getRestaurant, listSmartFinds } from "@/src/lib/data/db";

/** Current prices and availability for re-ordering a past order. */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.customerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [restaurant, menu, products] = await Promise.all([
    order.restaurantId ? getRestaurant(order.restaurantId) : Promise.resolve(undefined),
    order.restaurantId ? getMenuForRestaurant(order.restaurantId) : Promise.resolve([]),
    order.items.some((i) => i.kind === "smart_find") ? listSmartFinds() : Promise.resolve([]),
  ]);
  const menuById = new Map(menu.map((m) => [m.id, m]));
  const prodById = new Map(products.map((p) => [p.id, p]));
  const items: { kind: "food" | "smart_find"; menuItemId?: string; productId?: string; name: string; quantity: number; unitPriceUsd: number; imageUrl?: string }[] = [];
  const missing: string[] = [];
  for (const it of order.items) {
    if (it.kind === "food" && it.menuItemId) {
      const m = menuById.get(it.menuItemId);
      if (!m || !m.available) missing.push(it.name);
      else items.push({ kind: "food", menuItemId: m.id, name: m.name, quantity: it.quantity, unitPriceUsd: m.priceUsd, imageUrl: m.imageUrl });
    } else if (it.kind === "smart_find" && it.productId) {
      const p = prodById.get(it.productId);
      if (!p || p.stock <= 0) missing.push(it.name);
      else items.push({ kind: "smart_find", productId: p.id, name: p.name, quantity: it.quantity, unitPriceUsd: p.priceUsd, imageUrl: p.imageUrl });
    }
  }
  return NextResponse.json({
    restaurantId: order.restaurantId ?? null,
    restaurantName: restaurant?.name ?? null,
    restaurantOpen: restaurant ? restaurant.isOpen : true,
    restaurantStatus: restaurant?.availability ?? null,
    items,
    missing,
  });
}
