"use client";
import { create } from "zustand";
import type { OrderItem } from "@/src/lib/types";
import { confirmDialog } from "@/src/components/ConfirmDialog";

type CartState = {
  items: OrderItem[];
  restaurantId?: string;
  /** Resolves true when the item was added (false if the user kept the other cart). */
  addItem: (item: OrderItem, opts?: { restaurantId?: string }) => Promise<boolean>;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurantId: undefined,
  addItem: async (item, opts) => {
    const { restaurantId } = get();
    const incomingRest = opts?.restaurantId;
    const sameRestaurant = !restaurantId || !incomingRest || restaurantId === incomingRest;
    if (!sameRestaurant) {
      const proceed = await confirmDialog({
        title: "Commencer un nouveau panier ?",
        message: "Ton panier contient des plats d’un autre restaurant. Une commande = un restaurant.",
        confirmLabel: "Vider et ajouter",
        cancelLabel: "Garder mon panier",
      });
      if (!proceed) return false;
    }
    const baseItems = sameRestaurant ? get().items : [];
    set({
      items: mergeItem(baseItems, item),
      restaurantId: incomingRest ?? get().restaurantId,
    });
    return true;
  },
  removeItem: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    set({ items, restaurantId: items.length ? get().restaurantId : undefined });
  },
  setQuantity: (id, quantity) => {
    const items = get()
      .items.map((i) => (i.id === id ? { ...i, quantity } : i))
      .filter((i) => i.quantity > 0);
    set({ items, restaurantId: items.length ? get().restaurantId : undefined });
  },
  clear: () => set({ items: [], restaurantId: undefined }),
}));

function mergeItem(items: OrderItem[], incoming: OrderItem): OrderItem[] {
  const existing = items.find(
    (i) =>
      i.kind === incoming.kind &&
      i.menuItemId === incoming.menuItemId &&
      i.productId === incoming.productId,
  );
  if (existing) {
    return items.map((i) =>
      i === existing ? { ...i, quantity: i.quantity + incoming.quantity } : i,
    );
  }
  return [...items, incoming];
}

