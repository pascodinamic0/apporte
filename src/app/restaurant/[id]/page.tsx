import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Star, UtensilsCrossed } from "lucide-react";
import { SafeImage } from "@/src/components/SafeImage";
import { getMenuForRestaurant, getRestaurant } from "@/src/lib/data/db";
import { cn, formatPriceUSD } from "@/src/lib/utils";
import type { MenuItem } from "@/src/lib/types";
import { AddToCartButton } from "./parts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await getRestaurant(id);
  if (!r) return { title: "Restaurant introuvable" };
  return {
    title: `${r.name} · livraison à ${r.zone}`,
    description: `Commande chez ${r.name} (${r.cuisine}) à Kinshasa, livré en ${r.etaMinutes} min environ avec Apporte.`,
    openGraph: r.imageUrl ? { images: [r.imageUrl] } : undefined,
  };
}

const LAST = ["Accompagnement", "Dessert", "Boisson"];

function groupMenu(menu: MenuItem[]) {
  const groups = new Map<string, MenuItem[]>();
  for (const m of menu) {
    const key = LAST.includes(m.cuisineTag || "") ? m.cuisineTag! : "Plats";
    groups.set(key, [...(groups.get(key) || []), m]);
  }
  const order = ["Plats", ...LAST];
  const label: Record<string, string> = { Plats: "Plats", Accompagnement: "Accompagnements", Dessert: "Desserts", Boisson: "Boissons" };
  return order.filter((k) => groups.get(k)?.length).map((k) => ({ key: k, label: label[k], items: groups.get(k)! }));
}

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRestaurant(id);
  if (!r) return notFound();
  const menu = await getMenuForRestaurant(r.id);
  const groups = groupMenu(menu);
  return (
    <div className="py-2">
      <div className="relative overflow-hidden rounded-2xl">
        <SafeImage src={r.imageUrl} alt={r.name} width={1200} height={600} priority className="h-44 w-full object-cover sm:h-56" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow sm:text-3xl">{r.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/95">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 backdrop-blur">{r.cuisine}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{r.etaMinutes} min</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current" aria-hidden />{r.rating.toFixed(1)}</span>
            <span>· {r.zone}</span>
          </div>
        </div>
      </div>

      {menu.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
          <h2 className="mt-3 font-semibold">Menu en cours de mise à jour</h2>
          <p className="mt-1 text-sm text-gray-600">Ce restaurant n’a pas encore publié ses plats.</p>
          <Link href="/food" className="mt-3 inline-block text-sm font-medium">Voir les autres restaurants</Link>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mt-6" aria-labelledby={`sec-${g.key}`}>
            <h2 id={`sec-${g.key}`} className="mb-3 text-lg font-bold">{g.label}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {g.items.map((m) => (
                <article key={m.id} data-menu-item={m.id} className={cn("card-elevated flex gap-3 border border-gray-200 bg-white p-3 sm:p-4", !m.available && "opacity-70")}>
                  <SafeImage
                    src={m.imageUrl}
                    alt={m.name}
                    width={320}
                    height={240}
                    className={cn("h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28", !m.available && "grayscale")}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="font-semibold leading-snug">{m.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-sm text-gray-600">{m.description}</div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="font-bold tabular-nums text-emerald-800">{formatPriceUSD(m.priceUsd)}</div>
                      <AddToCartButton menuItem={m} restaurantId={r.id} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
