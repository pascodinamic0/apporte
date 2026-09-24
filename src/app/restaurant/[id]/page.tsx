import { notFound } from "next/navigation";
import { getMenuForRestaurant, getRestaurant } from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
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
      <h1 className="text-2xl font-semibold">{r.name}</h1>
      <div className="text-sm text-gray-600 mb-4">
        {r.cuisine} • {r.etaMinutes} min • {r.rating.toFixed(1)}★
      </div>
      <div className="grid gap-3">
        {menu.map((m) => (
          <Card key={m.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-gray-600">{m.description}</div>
              </div>
              <div className="text-emerald-800 font-medium">{formatPriceUSD(m.priceUsd)}</div>
            </CardHeader>
            <CardContent className="flex items-center justify-end">
              <AddToCartButton menuItem={m} restaurantId={r.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

