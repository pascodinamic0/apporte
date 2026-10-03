"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Check, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useCartStore } from "@/src/store/cart";
import type { MenuItem } from "@/src/lib/types";

export function AddToCartButton({ menuItem, restaurantId, closed = false }: { menuItem: MenuItem; restaurantId: string; closed?: boolean }) {
  const add = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  if (closed) {
    return (
      <Button variant="outline" size="sm" disabled aria-disabled className="rounded-full">
        Fermé
      </Button>
    );
  }
  if (!menuItem.available) {
    return (
      <span
        className="inline-flex h-9 cursor-not-allowed select-none items-center rounded-full bg-gray-200 px-3 text-sm font-medium text-gray-500"
        aria-disabled="true"
        data-testid="dish-unavailable"
      >
        Indisponible
      </span>
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
