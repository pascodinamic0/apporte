import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Star, UtensilsCrossed } from "lucide-react";
import { SafeImage } from "@/src/components/SafeImage";
import { getMenuForRestaurant, getRestaurant } from "@/src/lib/data/db";
import { cn, formatPriceUSD } from "@/src/lib/utils";
import type { MenuItem } from "@/src/lib/types";
import { AddToCartButton } from "./parts";
import { LiveRefresh } from "@/src/components/LiveRefresh";
import { DAY_NAMES, formatHoursRange, kinshasaClock } from "@/src/lib/hours";

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

const ORDER = ["Entrées", "Plats", "Grillades", "Accompagnements", "Desserts", "Boissons"];

function groupMenu(menu: MenuItem[]) {
  const groups = new Map<string, MenuItem[]>();
  for (const m of menu) {
    const key = m.category || "Plats";
    groups.set(key, [...(groups.get(key) || []), m]);
  }
  const keys = Array.from(groups.keys()).sort((a, b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
    return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib) || a.localeCompare(b);
  });
  return keys.map((k) => ({ key: k.replace(/\W+/g, "-"), label: k, items: groups.get(k)! }));
}

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRestaurant(id);
  if (!r) return notFound();
  const menu = await getMenuForRestaurant(r.id);
  const groups = groupMenu(menu);
  const av = r.availability;
  const today = kinshasaClock(new Date()).day;
  return (
    <div className="py-2">
      <LiveRefresh topics={[`restaurant:${r.id}`]} badge={false} pollMs={60_000} />
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
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", r.isOpen ? "bg-emerald-500 text-white" : "bg-white text-gray-900")} data-testid="restaurant-open-state">
              {r.isOpen ? "Ouvert" : av?.label ?? "Fermé"}
            </span>
          </div>
        </div>
      </div>

      {!r.isOpen && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4" role="status" data-testid="closed-banner">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden />
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {av?.reason === "paused" ? "Ce restaurant ne prend pas de commandes pour le moment" : av?.reason === "suspended" ? "Ce restaurant est indisponible" : "Ce restaurant est fermé"}
              {av?.detail && av.reason === "outside_hours" ? ` · ${av.detail}` : ""}
            </div>
            <div className="text-gray-600">Tu peux consulter le menu, mais pas commander maintenant.</div>
          </div>
        </div>
      )}

      {r.hours && (
        <details className="mt-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Horaires · aujourd’hui {formatHoursRange(r.hours[today])}</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <li key={d} className={cn("flex justify-between gap-4", d === today && "font-semibold")}>
                <span>{DAY_NAMES[d]}</span>
                <span className="tabular-nums text-gray-700">{formatHoursRange(r.hours![d])}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

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
                <article key={m.id} data-menu-item={m.id} data-available={m.available ? "1" : "0"} className={cn("card-elevated flex gap-3 border border-gray-200 bg-white p-3 sm:p-4", !m.available && "bg-gray-50 opacity-60 grayscale")}>
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
                      <AddToCartButton menuItem={m} restaurantId={r.id} closed={!r.isOpen} />
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
