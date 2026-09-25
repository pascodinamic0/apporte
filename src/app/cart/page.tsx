"use client";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, Utensils } from "lucide-react";
import { useCartStore } from "@/src/store/cart";
import { Button } from "@/src/components/ui/button";
import { formatPriceUSD } from "@/src/lib/utils";
import { SafeImage } from "@/src/components/SafeImage";

export default function CartPage() {
  const { items, clear, removeItem, setQuantity } = useCartStore();
  const subtotal = items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="py-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Panier</h1>
          <p className="mt-1 text-sm text-gray-600">
            {count === 0
              ? "Rien pour le moment."
              : `${count} article${count > 1 ? "s" : ""}`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline"
          >
            Vider
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/empty-cart.png"
            alt=""
            className="mx-auto h-28 w-28 object-contain"
          />
          <h2 className="mt-4 text-lg font-semibold">Ton panier est vide</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-600">
            Choisis un restaurant à Gombe, ou ajoute une trouvaille utile.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/food">
              <Button className="w-full gap-2 sm:w-auto">
                <Utensils className="h-4 w-4" />
                Découvrir à manger
              </Button>
            </Link>
            <Link href="/smart-finds">
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                <ShoppingBag className="h-4 w-4" />
                Trouvailles
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                <SafeImage
                  src={item.imageUrl}
                  alt={item.name}
                  width={160}
                  height={160}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="mt-0.5 text-sm text-gray-500">
                        {item.kind === "food" ? "Restaurant" : "Trouvaille"} ·{" "}
                        {formatPriceUSD(item.unitPriceUsd)}
                      </div>
                    </div>
                    <div className="shrink-0 font-semibold text-emerald-800">
                      {formatPriceUSD(item.unitPriceUsd * item.quantity)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        aria-label="Diminuer la quantité"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-white"
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Augmenter la quantité"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-white"
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Retirer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Résumé
            </h2>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{formatPriceUSD(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">Livraison</span>
              <span className="text-gray-500">À la caisse</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-extrabold text-emerald-800">
                {formatPriceUSD(subtotal)}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Les frais de livraison s’ajoutent quand tu confirmes l’adresse.
            </p>
            <Link href="/checkout" className="mt-4 block">
              <Button className="w-full">Passer à la caisse</Button>
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
