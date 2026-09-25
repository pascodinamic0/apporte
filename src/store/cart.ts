"use client";
import { create } from "zustand";
import type { OrderItem } from "@/src/lib/types";

type CartState = {
  items: OrderItem[];
  restaurantId?: string;
  addItem: (item: OrderItem, opts?: { restaurantId?: string }) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurantId: undefined,
  addItem: (item, opts) => {
    const { items, restaurantId } = get();
    const incomingRest = opts?.restaurantId;
    const sameRestaurant = !restaurantId || !incomingRest || restaurantId === incomingRest;
    if (!sameRestaurant && typeof window !== "undefined") {
      const proceed = window.confirm(
        "Ton panier contient des articles d’un autre restaurant. Le vider et ajouter celui-ci ?",
      );
      if (!proceed) return;
    }
    const baseItems = sameRestaurant ? items : [];
    set({
      items: mergeItem(baseItems, item),
      restaurantId: incomingRest ?? restaurantId,
    });
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

