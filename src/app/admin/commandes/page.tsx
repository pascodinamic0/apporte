import type { Metadata } from "next";
import Link from "next/link";
import { getRestaurants, listOrdersAll } from "@/src/lib/data/db";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { cn } from "@/src/lib/utils";
import { OrderRow, Panel } from "../parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes" };

const FILTERS = [
  { key: "active", label: "En cours" },
  { key: "delivered", label: "Livrées" },
  { key: "cancelled", label: "Annulées" },
  { key: "all", label: "Toutes" },
] as const;
type F = (typeof FILTERS)[number]["key"];

export default async function AdminOrders({ searchParams }: { searchParams?: Promise<{ f?: string }> }) {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const sp = (await searchParams) || {};
  const f: F = FILTERS.some((x) => x.key === sp.f) ? (sp.f as F) : "active";
  const [orders, restaurants] = await Promise.all([listOrdersAll(), getRestaurants()]);
  const names = new Map(restaurants.map((r) => [r.id, r.name]));
  const pick = (k: F) =>
    orders.filter((o) =>
      k === "all" ? true : k === "delivered" ? o.status === "delivered" : k === "cancelled" ? o.status === "cancelled" : o.status !== "delivered" && o.status !== "cancelled",
    );
  const list = pick(f);
  return (
    <div>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Commandes</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/admin/commandes?f=${x.key}`}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm", f === x.key ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700")}
            style={f === x.key ? { color: "#fff" } : undefined}
          >
            {x.label} <span className="tabular-nums opacity-70">{pick(x.key).length}</span>
          </Link>
        ))}
      </div>
      <Panel title={`${list.length} commande${list.length > 1 ? "s" : ""}`}>
        {list.length === 0 ? (
          <p className="p-4 text-sm text-gray-600">Aucune commande dans cette catégorie.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.slice(0, 200).map((o) => <OrderRow key={o.id} o={o} restaurantName={o.restaurantId ? names.get(o.restaurantId) : undefined} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
