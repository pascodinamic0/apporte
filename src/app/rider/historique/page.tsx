import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { getRestaurants, listOrdersForRider } from "@/src/lib/data/db";
import { AccessRequired } from "@/src/components/AccessRequired";
import { articleCountLabel, formatDateFr, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Historique des courses" };

export default async function RiderHistory() {
  const user = await requireRole(["rider"]);
  if (!user || !user.riderId) return <AccessRequired role="livreur" />;
  const [orders, restaurants] = await Promise.all([listOrdersForRider(user.riderId), getRestaurants()]);
  const names = new Map(restaurants.map((r) => [r.id, r.name]));
  const done = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");
  const delivered = done.filter((o) => o.status === "delivered");
  const earned = delivered.reduce((s, o) => s + Math.round(o.deliveryFeeUsd * 0.7 * 100) / 100, 0);
  return (
    <div className="py-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Historique</h1>
      <p className="mt-1 text-sm text-gray-600">
        {delivered.length} course{delivered.length > 1 ? "s" : ""} livrée{delivered.length > 1 ? "s" : ""} · {formatPriceUSD(earned)} de gains au total
      </p>
      {done.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/empty-rider.png" alt="" className="mx-auto h-24 w-24 object-contain" />
          <div className="mt-3 font-semibold">Aucune course terminée</div>
          <Link href="/rider" className="mt-2 inline-block text-sm font-medium">Retour aux courses</Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {done.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{o.restaurantId ? names.get(o.restaurantId) ?? "Restaurant" : "Trouvailles"} → {o.zone}</div>
                <div className="text-xs text-gray-600">
                  #{o.id.slice(-6)} · {formatDateFr(o.updatedAt)} · {articleCountLabel(o.items)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold text-emerald-800">
                  {o.status === "delivered" ? `+${formatPriceUSD(Math.round(o.deliveryFeeUsd * 0.7 * 100) / 100)}` : "—"}
                </div>
                <div className="text-xs text-gray-500">{statusLabelFr(o.status)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
