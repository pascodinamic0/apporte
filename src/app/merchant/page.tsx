import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { getRestaurant, listOrdersForRestaurant, listRiders } from "@/src/lib/data/db";
import { AccessRequired } from "@/src/components/AccessRequired";
import { KitchenBoard } from "./KitchenBoard";
import { toBoardOrder } from "./board-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes du restaurant" };

const TAB_ALIASES: Record<string, "new" | "kitchen" | "ready" | "history"> = {
  new: "new",
  preparing: "kitchen",
  kitchen: "kitchen",
  ready: "ready",
  history: "history",
};

export default async function MerchantHome({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const user = await requireRole(["merchant"]);
  if (!user || !user.merchantId) return <AccessRequired role="commerçant" />;
  const rid = user.merchantId;
  const [rest, orders, riders] = await Promise.all([getRestaurant(rid), listOrdersForRestaurant(rid), listRiders()]);
  if (!rest) return <AccessRequired role="commerçant" />;
  const riderName = new Map(riders.map((r) => [r.id, r.name]));
  const sp = (await searchParams) || {};
  return (
    <KitchenBoard
      initialRestaurant={rest}
      initialOrders={orders.slice(0, 120).map((o) => toBoardOrder(o, riderName))}
      initialTab={TAB_ALIASES[sp.tab || ""] ?? "new"}
    />
  );
}
