"use client";
import { Button } from "@/src/components/ui/button";
import { useCartStore } from "@/src/store/cart";
import type { MenuItem } from "@/src/lib/types";

export function AddToCartButton({
  menuItem,
  restaurantId,
}: {
  menuItem: MenuItem;
  restaurantId: string;
}) {
  const add = useCartStore((s) => s.addItem);
  return (
    <Button
      onClick={() =>
        add(
          {
            id: `ci_${menuItem.id}`,
            kind: "food",
            menuItemId: menuItem.id,
            restaurantId,
            name: menuItem.name,
            quantity: 1,
            unitPriceUsd: menuItem.priceUsd,
            imageUrl: menuItem.imageUrl,
          },
          { restaurantId },
        )
      }
    >
      Ajouter au panier
    </Button>
  );
}

