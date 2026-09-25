"use client";
import Link from "next/link";
import { useCartStore } from "@/src/store/cart";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { formatPriceUSD } from "@/src/lib/utils";
import { SafeImage } from "@/src/components/SafeImage";

export default function CartPage() {
  const { items, clear, removeItem } = useCartStore();
  const subtotal = items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Panier</h1>
      {items.length === 0 && (
        <div className="mb-4">
          <div className="text-gray-600 flex flex-col items-center justify-center py-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/empty-cart.png" alt="" className="h-24 w-auto mb-3" />
            <div className="mb-3 text-sm">Ton panier est vide.</div>
            <div className="flex gap-2">
              <Link href="/smart-finds">
                <Button variant="secondary">Découvrir les Trouvailles</Button>
              </Link>
              <Link href="/food">
                <Button variant="outline">Voir la nourriture</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-3">
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
            <CardContent className="flex items-center justify-between">
              <SafeImage src={i.imageUrl} alt={i.name} width={160} height={100} className="h-20 w-40 rounded-md object-cover" />
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
          {items.length > 0 ? (
            <Link href="/checkout">
              <Button>Passer à la caisse</Button>
            </Link>
          ) : (
            <Button disabled aria-disabled>
              Passer à la caisse
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

