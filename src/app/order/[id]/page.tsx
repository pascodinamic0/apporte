import { notFound } from "next/navigation";
import { getOrder } from "@/src/lib/data/memory";
import { formatPriceUSD } from "@/src/lib/utils";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { RateOrder } from "./parts";

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
  // Fetch via API to ensure consistency across runtimes in demo mode
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://127.0.0.1:${process.env.PORT || 3000}`);
  const res = await fetch(`${base}/api/orders/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return notFound();
  const { order } = (await res.json()) as { order: any };
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
            Code de livraison (PIN):{" "}
            <span className="font-mono font-semibold text-emerald-800">{order.pin}</span>
          </div>
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

