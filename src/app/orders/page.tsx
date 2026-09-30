import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { getRestaurant, listOrdersForCustomer } from "@/src/lib/data/db";
import { formatDateFr, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";
import { ReorderButton } from "@/src/components/ReorderButton";
import { SafeImage } from "@/src/components/SafeImage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes commandes", robots: { index: false } };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="py-6">
        <div className="text-lg">Connecte-toi d’abord.</div>
        <Link href="/demo" className="text-emerald-700 underline">Ouvrir la page Démo</Link>
      </div>
    );
  }
  const orders = user.role === "customer" ? await listOrdersForCustomer(user.id) : [];
  const restIds = Array.from(new Set(orders.map((o) => o.restaurantId).filter(Boolean))) as string[];
  const rests = await Promise.all(restIds.map((id) => getRestaurant(id)));
  const restMap = new Map(rests.filter(Boolean).map((r) => [r!.id, r!]));
  return (
    <div className="py-2">
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Mes commandes</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <img src="/images/empty-orders.png" alt="" className="mx-auto h-24 w-24 object-contain" />
          <p className="mt-3 text-sm text-gray-600">Aucune commande pour l’instant.</p>
          <Link href="/food" className="mt-2 inline-block text-sm font-medium text-emerald-800">Voir les restaurants</Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => {
            const rest = o.restaurantId ? restMap.get(o.restaurantId) : undefined;
            return (
              <li key={o.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <SafeImage src={o.items[0]?.imageUrl || rest?.imageUrl} alt="" width={96} height={72} className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{rest?.name || "Trouvailles"}</div>
                  <div className="truncate text-xs text-gray-600">{formatDateFr(o.createdAt)} · #{o.id.slice(-6).toUpperCase()} · {statusLabelFr(o.status)}</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-800">{formatPriceUSD(o.totalUsd)}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/order/${o.id}`} className="inline-flex h-10 items-center rounded-full border border-gray-300 px-4 text-sm font-semibold">Détails</Link>
                  <ReorderButton orderId={o.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
