"use client";
import { create } from "zustand";
import type { OrderItem } from "@/src/lib/types";

type CartState = {
  items: OrderItem[];
  restaurantId?: string;
  addItem: (item: OrderItem, opts?: { restaurantId?: string }) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurantId: undefined,
  addItem: (item, opts) => {
    const { items, restaurantId } = get();
    const sameRestaurant =
      !restaurantId || !opts?.restaurantId || restaurantId === opts.restaurantId;
    set({
      items: mergeItem(items, item),
      restaurantId: sameRestaurant ? opts?.restaurantId ?? restaurantId : opts?.restaurantId,
    });
  },
  removeItem: (id) => {
    set({ items: get().items.filter((i) => i.id !== id) });
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

