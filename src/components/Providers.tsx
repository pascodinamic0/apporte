"use client";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useCartStore } from "@/src/store/cart";

export function Providers() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW register failed", err));
    }
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("apporte_cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          useCartStore.setState({
            items: parsed.items || [],
            restaurantId: parsed.restaurantId,
          });
        }
      }
    } catch {}
    const unsub = useCartStore.subscribe((s) => {
      try {
        localStorage.setItem("apporte_cart", JSON.stringify({ items: s.items, restaurantId: s.restaurantId }));
      } catch {}
    });
    return () => unsub();
  }, []);
  return <Toaster position="top-right" />;
}

