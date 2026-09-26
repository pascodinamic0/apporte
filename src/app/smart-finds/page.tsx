import type { Metadata } from "next";
import { listSmartFinds } from "@/src/lib/data/db";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatPriceUSD } from "@/src/lib/utils";
import { AddSmartFindToCartButton } from "./parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trouvailles", description: "Petits produits utiles livrés avec ton repas à la Gombe." };

export default async function SmartFindsPage() {
  const products = await listSmartFinds();
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold">Trouvailles</h1>
      <p className="text-sm text-gray-700 mb-3">
        Ajoute des produits malins à ta livraison — pratique et rapide.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-600">{p.description}</div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  width={320}
                  height={160}
                  className="h-20 w-28 rounded-lg object-cover"
                />
              ) : (
                <div className="h-20 w-28 rounded-lg brand-gradient flex items-center justify-center text-xl">
                  📦
                </div>
              )}
              <div className="ml-auto text-emerald-800 font-medium">{formatPriceUSD(p.priceUsd)}</div>
              <AddSmartFindToCartButton product={p} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

