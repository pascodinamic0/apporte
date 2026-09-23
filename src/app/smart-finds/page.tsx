import { listSmartFinds } from "@/src/lib/data/memory";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatPriceUSD } from "@/src/lib/utils";
import { AddSmartFindToCartButton } from "./parts";

export const dynamic = "force-dynamic";

export default function SmartFindsPage() {
  const products = listSmartFinds();
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Trouvailles</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-600">{p.description}</div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-emerald-800 font-medium">{formatPriceUSD(p.priceUsd)}</div>
              <AddSmartFindToCartButton product={p} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

