"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Check, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useCartStore } from "@/src/store/cart";
import type { MenuItem } from "@/src/lib/types";

export function AddToCartButton({ menuItem, restaurantId }: { menuItem: MenuItem; restaurantId: string }) {
  const add = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  if (!menuItem.available) {
    return (
      <Button variant="outline" size="sm" disabled aria-disabled className="rounded-full">
        Indisponible
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      className="gap-1.5 rounded-full"
      aria-label={`Ajouter ${menuItem.name} au panier`}
      onClick={async () => {
        const ok = await add(
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
        );
        if (ok) {
          toast.success(`${menuItem.name} ajouté au panier`, { id: "cart-add" });
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1200);
        }
      }}
    >
      {justAdded ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
      Ajouter
    </Button>
  );
}
