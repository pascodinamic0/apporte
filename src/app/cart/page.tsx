"use client";
import Link from "next/link";
import { useCartStore } from "@/src/store/cart";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { formatPriceUSD } from "@/src/lib/utils";

export default function CartPage() {
  const { items, clear, removeItem } = useCartStore();
  const subtotal = items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Panier</h1>
      <div className="grid gap-3">
        {items.length === 0 && (
          <div className="text-gray-600">Ton panier est vide.</div>
        )}
        {items.map((i) => (
          <Card key={i.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <div className="font-medium">{i.name}</div>
                <div className="text-sm text-gray-600">x{i.quantity}</div>
              </div>
              <div className="text-emerald-800 font-medium">
                {formatPriceUSD(i.unitPriceUsd * i.quantity)}
              </div>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button variant="outline" onClick={() => removeItem(i.id)}>
                Retirer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-lg">
          Sous-total: <span className="font-semibold">{formatPriceUSD(subtotal)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clear}>
            Vider
          </Button>
          <Link href="/checkout">
            <Button>Passer à la caisse</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

