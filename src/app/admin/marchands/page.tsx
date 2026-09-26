import type { Metadata } from "next";
import Link from "next/link";
import { countMenuItemsByRestaurant, getRestaurants, listOrdersAll } from "@/src/lib/data/db";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { SafeImage } from "@/src/components/SafeImage";
import { Panel } from "../parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marchands" };

export default async function AdminMerchants() {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const [restaurants, counts, orders] = await Promise.all([getRestaurants(), countMenuItemsByRestaurant(), listOrdersAll()]);
  const ordersBy = new Map<string, number>();
  for (const o of orders) if (o.restaurantId) ordersBy.set(o.restaurantId, (ordersBy.get(o.restaurantId) || 0) + 1);
  return (
    <div>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Marchands</h1>
      <Panel title={`${restaurants.length} restaurants · zone Gombe`}>
        <ul className="divide-y divide-gray-100">
          {restaurants.map((r) => {
            const c = counts[r.id] || { total: 0, available: 0 };
            return (
              <li key={r.id}>
                <Link href={`/restaurant/${r.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 sm:p-4" style={{ color: "inherit" }}>
                  <SafeImage src={r.imageUrl} alt={r.name} width={96} height={72} className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="truncate text-xs text-gray-600">{r.cuisine} · {r.zone} · {r.rating.toFixed(1)} ★ · {ordersBy.get(r.id) || 0} commande(s)</div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <div className="font-semibold">{c.total} plats</div>
                    <div className="text-gray-500">{c.available} disponibles</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
