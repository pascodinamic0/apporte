import { notFound } from "next/navigation";
import { getOrder } from "@/src/lib/data/db";
import { formatPriceUSD } from "@/src/lib/utils";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { RateOrder } from "./parts";
import Image from "next/image";

export const dynamic = "force-dynamic";

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

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Read directly from in-process data layer to avoid self-fetch issues
  const order = await getOrder(id);
  if (!order) return notFound();
  const idx = steps.indexOf(order.status as any);
  return (
      <div className="py-2">
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
                  <h3 className="font-medium capitalize">
                    {labelForStatus(s)}
                  </h3>
                  {i === idx && <p className="text-sm text-gray-600">Étape en cours…</p>}
                </li>
              ))}
            </ol>
            <div className="mt-3 text-sm">
              Code de livraison (PIN):
              <span className="ml-2 inline-block rounded-md bg-emerald-50 px-2 py-1 font-mono text-base font-bold text-emerald-800">
                {order.pin}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-3">
          <CardHeader>Articles</CardHeader>
          <CardContent className="grid gap-2">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {it.imageUrl ? (
                    <Image src={it.imageUrl} alt={it.name} width={64} height={48} className="h-12 w-16 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-16 rounded brand-gradient flex items-center justify-center">🍽️</div>
                  )}
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
        {order.status === "delivered" && <RateOrder orderId={order.id} existing={order.rating} />}
      </div>
  );
}

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

