"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/src/lib/utils";
import { useCartStore } from "@/src/store/cart";

export function LogoutButton({ variant = "full", className }: { variant?: "full" | "icon"; className?: string }) {
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try {
      const r = await fetch("/api/demo/logout", { method: "POST" });
      if (!r.ok) throw new Error(String(r.status));
      useCartStore.getState().clear();
      try {
        localStorage.removeItem("apporte_checkout_phone");
      } catch {}
      window.location.assign("/");
    } catch {
      setPending(false);
      toast.error("Déconnexion impossible. Vérifie ta connexion.");
    }
  }
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900", className)}
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60",
        className,
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
