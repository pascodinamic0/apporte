import { notFound } from "next/navigation";
import { SafeImage } from "@/src/components/SafeImage";
import { getMenuForRestaurant, getRestaurant } from "@/src/lib/data/db";
import { Card } from "@/src/components/ui/card";
import { formatPriceUSD } from "@/src/lib/utils";
import { AddToCartButton } from "./parts";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getRestaurant(id);
  if (!r) return notFound();
  const menu = await getMenuForRestaurant(r.id);
  return (
    <div className="py-2">
      <div className="rounded-xl overflow-hidden">
        <SafeImage
          src={r.imageUrl}
          alt={r.name}
          width={1200}
          height={600}
          className="h-40 w-full object-cover"
        />
      </div>
      <h1 className="text-2xl font-semibold mt-3">{r.name}</h1>
      <div className="text-sm text-gray-600 mb-4">
        {r.cuisine} • {r.etaMinutes} min • {r.rating.toFixed(1)}★
      </div>
      <div className="grid gap-3">
        {menu.map((m) => (
          <Card key={m.id}>
            <div className="flex gap-3 p-3 sm:p-4">
              <SafeImage
                src={m.imageUrl}
                alt={m.name}
                width={640}
                height={320}
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-gray-600">{m.description}</div>
                  </div>
                  <div className="shrink-0 font-semibold text-emerald-800">
                    {formatPriceUSD(m.priceUsd)}
                  </div>
                </div>
                <div className="mt-3">
                  <AddToCartButton menuItem={m} restaurantId={r.id} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

