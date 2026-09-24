"use client";
import Link from "next/link";
import { useCartStore } from "@/src/store/cart";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { formatPriceUSD } from "@/src/lib/utils";
import Image from "next/image";

export default function CartPage() {
  const { items, clear, removeItem } = useCartStore();
  const subtotal = items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Panier</h1>
      {items.length === 0 && (
        <div className="mb-3 text-sm">
          Besoin d’idées ?{" "}
          <Link href="/smart-finds" className="text-emerald-700 underline">
            Découvre les Trouvailles
          </Link>
        </div>
      )}
      <div className="grid gap-3">
        {items.length === 0 && (
          <div className="text-gray-600 flex flex-col items-center justify-center py-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/apporte.svg" alt="" className="h-12 w-12 mb-2" />
            Ton panier est vide.
          </div>
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
            <CardContent className="flex items-center justify-between">
              {i.imageUrl ? (
                <Image src={i.imageUrl} alt={i.name} width={160} height={100} className="h-20 w-40 rounded-md object-cover" />
              ) : (
                <div className="h-20 w-40 rounded-md brand-gradient flex items-center justify-center text-2xl">🧺</div>
              )}
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

