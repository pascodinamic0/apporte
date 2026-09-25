"use client";
import { useMemo, useState } from "react";
import type { Order } from "@/src/lib/types";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { SafeImage } from "@/src/components/SafeImage";
import { formatPriceUSD, statusLabelFr } from "@/src/lib/utils";

export function MerchantOrdersList({ orders, restaurantImage }: { orders: Order[]; restaurantImage?: string }) {
  const [tab, setTab] = useState<"new" | "preparing" | "ready">("new");
  const filtered = useMemo(() => {
    if (tab === "new") return orders.filter((o) => o.status === "placed");
    if (tab === "preparing") return orders.filter((o) => o.status === "restaurant_accepted" || o.status === "preparing");
    return orders.filter((o) => o.status === "rider_searching");
  }, [orders, tab]);
  return (
    <div className="grid gap-3">
      <div className="flex gap-2 mb-2 overflow-x-auto">
        <button onClick={() => setTab("new")} className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${tab==="new"?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-white border-gray-200 text-gray-700"}`}>Nouvelles</button>
        <button onClick={() => setTab("preparing")} className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${tab==="preparing"?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-white border-gray-200 text-gray-700"}`}>En préparation</button>
        <button onClick={() => setTab("ready")} className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${tab==="ready"?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-white border-gray-200 text-gray-700"}`}>Prêtes</button>
      </div>
      {filtered.map((o) => (
        <Card key={o.id}>
          <CardHeader className="flex items-center justify-between">
            <div>
              <div className="font-medium">Commande #{o.id.slice(-6)}</div>
              <div className="text-sm text-gray-600">
                {o.items.length} article{o.items.length>1?"s":""} • {formatPriceUSD(o.totalUsd)} • {o.zone}
              </div>
            </div>
            <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{statusLabelFr(o.status)}</div>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <SafeImage src={o.items[0]?.imageUrl || restaurantImage} alt={o.items[0]?.name || "Article"} width={96} height={64} className="h-16 w-24 rounded-md object-cover" />
          </CardContent>
        </Card>
      ))}
      {filtered.length === 0 && <div className="text-gray-600">Aucune commande.</div>}
    </div>
  );
}

