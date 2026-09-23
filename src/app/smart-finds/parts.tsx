"use client";
import { Button } from "@/src/components/ui/button";
import { useCartStore } from "@/src/store/cart";
import type { SmartFindProduct } from "@/src/lib/types";

export function AddSmartFindToCartButton({ product }: { product: SmartFindProduct }) {
  const add = useCartStore((s) => s.addItem);
  const onAdd = () =>
    add({
      id: `ci_${product.id}`,
      kind: "smart_find",
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPriceUsd: product.priceUsd,
      imageUrl: product.imageUrl,
    });
  return <Button onClick={onAdd}>Ajouter</Button>;
}

