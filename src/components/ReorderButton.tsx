"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RotateCcw } from "lucide-react";
import { useCartStore } from "@/src/store/cart";
import { confirmDialog } from "./ConfirmDialog";
import { cn } from "@/src/lib/utils";

/** Refill the cart from a past order (current prices, available items only). */
export function ReorderButton({ orderId, className, variant = "solid" }: { orderId: string; className?: string; variant?: "solid" | "outline" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      if (!data.items.length) {
        toast.error("Ces articles ne sont plus disponibles.");
        return;
      }
      const cart = useCartStore.getState();
      if (cart.items.length) {
        const ok = await confirmDialog({
          title: "Remplacer ton panier ?",
          message: "Ton panier actuel sera remplacé par les articles de cette commande.",
          confirmLabel: "Remplacer",
        });
        if (!ok) return;
      }
      useCartStore.setState({
        restaurantId: data.restaurantId ?? undefined,
        items: data.items.map((i: any) => ({
          id: `ci_${i.menuItemId || i.productId}`,
          kind: i.kind,
          menuItemId: i.menuItemId,
          productId: i.productId,
          restaurantId: data.restaurantId ?? undefined,
          name: i.name,
          quantity: i.quantity,
          unitPriceUsd: i.unitPriceUsd,
          imageUrl: i.imageUrl,
        })),
      });
      if (data.missing.length) toast(`Indisponible aujourd’hui : ${data.missing.join(", ")}`, { icon: "ℹ️" });
      if (!data.restaurantOpen) toast(`${data.restaurantName} est fermé pour le moment. Ton panier est prêt pour plus tard.`, { icon: "🕒" });
      else toast.success("Panier prêt");
      router.push("/cart");
    } catch {
      toast.error("Impossible de recommander. Réessaie.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      data-testid="reorder"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold disabled:opacity-60",
        variant === "solid" ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
        className,
      )}
      style={variant === "solid" ? { color: "#fff" } : undefined}
    >
      <RotateCcw className="h-4 w-4" aria-hidden /> {busy ? "Un instant…" : "Commander à nouveau"}
    </button>
  );
}
