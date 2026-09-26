"use client";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useCartStore } from "@/src/store/cart";
import { ConfirmDialogHost } from "./ConfirmDialog";

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
  return (
    <>
      <Toaster
        position="top-center"
        containerStyle={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        toastOptions={{
          duration: 3500,
          style: { borderRadius: "14px", fontSize: "14px", maxWidth: "min(92vw, 420px)" },
          success: { iconTheme: { primary: "#047857", secondary: "#fff" } },
        }}
      />
      <ConfirmDialogHost />
    </>
  );
}

