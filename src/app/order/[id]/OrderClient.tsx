"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatPriceUSD } from "@/src/lib/utils";
import { SafeImage } from "@/src/components/SafeImage";

const steps = [
  "placed",
  "restaurant_accepted",
  "preparing",
  "rider_searching",
  "rider_assigned",
  "going_to_restaurant",
  "arrived",
  "picked_up",
  "delivering",
  "delivered",
] as const;

function labelForStatus(s: string) {
  switch (s) {
    case "placed":
      return "Commande passée";
    case "restaurant_accepted":
      return "Restaurant a accepté";
    case "preparing":
      return "En préparation";
    case "rider_searching":
      return "Recherche d’un livreur";
    case "rider_assigned":
      return "Livreur assigné";
    case "going_to_restaurant":
      return "En route vers le pickup";
    case "arrived":
      return "Livreur arrivé";
    case "picked_up":
      return "Commande récupérée";
    case "delivering":
      return "En livraison";
    case "delivered":
      return "Livré";
  }
  return s;
}

export function OrderClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const r = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const data = await r.json();
        if (!stop) setOrder(data.order);
      } catch {}
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [orderId]);

  if (!order) return null;
  const idx = steps.indexOf(order.status);
  return (
    <>
      <div className="rounded-lg overflow-hidden mb-2">
        <img src="/images/map.jpg" alt="Carte de Kinshasa" className="h-28 w-full object-cover" />
      </div>
      <h1 className="text-xl font-semibold mb-2">Commande #{order.id.slice(-6)}</h1>
      <div className="text-sm text-gray-600 mb-2">
        Total: {formatPriceUSD(order.totalUsd)} • Paiement: {order.paymentMethod}
      </div>
      <Card>
        <CardHeader>Suivi</CardHeader>
        <CardContent>
          <ol className="relative border-s border-gray-200">
            {steps.map((s, i) => (
              <li key={s} className="mb-6 ms-6">
                <span
                  className={`absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ${
                    i <= idx ? "bg-emerald-700 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {i + 1}
                </span>
                <h3 className="font-medium capitalize">{labelForStatus(s)}</h3>
                {i === idx && order.status !== "delivered" && (
                  <p className="text-sm text-gray-600">Étape en cours…</p>
                )}
                {order.status === "delivered" && i === idx && (
                  <p className="text-sm text-emerald-700">Commande livrée</p>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Card className="mt-3">
        <CardHeader>Articles</CardHeader>
        <CardContent className="grid gap-2">
          {order.items.map((it: any) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <SafeImage src={it.imageUrl} alt={it.name} width={64} height={48} className="h-12 w-16 rounded object-cover" />
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-gray-600">x{it.quantity}</div>
                </div>
              </div>
              <div>{formatPriceUSD(it.unitPriceUsd * it.quantity)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

