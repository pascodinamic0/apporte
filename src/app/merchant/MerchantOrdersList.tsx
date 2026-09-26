"use client";
import type { Order } from "@/src/lib/types";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { SafeImage } from "@/src/components/SafeImage";
import { articleCountLabel, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";

export function MerchantOrdersList({
  orders,
  restaurantImage,
}: {
  orders: Order[];
  restaurantImage?: string;
}) {
  return (
    <div className="grid gap-3">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardHeader className="flex items-center justify-between">
            <div>
              <div className="font-medium">Commande #{o.id.slice(-6)}</div>
              <div className="text-sm text-gray-600">
                {articleCountLabel(o.items)} • {formatPriceUSD(o.totalUsd)} • {o.zone}
              </div>
              {o.items[0]?.name && (
                <div className="text-xs text-gray-500 truncate max-w-[220px]">{o.items[0].name}</div>
              )}
            </div>
            <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{statusLabelFr(o.status)}</div>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <SafeImage
              src={o.items[0]?.imageUrl || restaurantImage}
              alt={o.items[0]?.name || "Article"}
              width={96}
              height={64}
              className="h-16 w-24 rounded-md object-cover"
            />
          </CardContent>
        </Card>
      ))}
      {orders.length === 0 && <div className="text-gray-600">Aucune commande.</div>}
    </div>
  );
}
