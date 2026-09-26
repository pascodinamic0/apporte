import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Utensils } from "lucide-react";
import { requireRole } from "@/src/lib/auth";
import { getRestaurant, listOrdersForRestaurant, listRiders } from "@/src/lib/data/db";
import { SafeImage } from "@/src/components/SafeImage";
import { Stagger } from "@/src/components/Stagger";
import { AccessRequired } from "@/src/components/AccessRequired";
import { articleCountLabel, cn, formatDateFr, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";
import type { Order, OrderStatus } from "@/src/lib/types";
import { MerchantActionButton } from "./MerchantActionButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes du restaurant" };

type TabKey = "new" | "preparing" | "ready" | "history";

const TAB_STATUSES: Record<TabKey, OrderStatus[]> = {
  new: ["placed"],
  preparing: ["restaurant_accepted", "preparing"],
  ready: ["rider_searching", "rider_assigned", "going_to_restaurant", "arrived"],
  history: ["picked_up", "delivering", "delivered", "cancelled"],
};

const TABS: { key: TabKey; label: string; empty: string }[] = [
  { key: "new", label: "Nouvelles", empty: "Aucune nouvelle commande pour le moment." },
  { key: "preparing", label: "En préparation", empty: "Rien en préparation." },
  { key: "ready", label: "Prêtes", empty: "Aucune commande en attente de livreur." },
  { key: "history", label: "Historique", empty: "Aucune commande terminée." },
];

function filterOrders(orders: Order[], tab: TabKey): Order[] {
  return orders.filter((o) => TAB_STATUSES[tab].includes(o.status));
}

export default async function MerchantHome({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireRole(["merchant"]);
  if (!user || !user.merchantId) return <AccessRequired role="commerçant" />;
  const rid = user.merchantId;
  const [rest, orders, riders] = await Promise.all([getRestaurant(rid), listOrdersForRestaurant(rid), listRiders()]);
  const riderName = new Map(riders.map((r) => [r.id, r.name]));
  const sp = (await searchParams) || {};
  const tab: TabKey = (["new", "preparing", "ready", "history"] as const).includes(sp.tab as TabKey)
    ? (sp.tab as TabKey)
    : "new";
  const visible = filterOrders(orders, tab);
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div className="py-2">
      <div className="relative mb-4 overflow-hidden rounded-2xl">
        <SafeImage src={rest?.imageUrl} alt={rest?.name || "Restaurant"} width={1200} height={320} className="h-24 w-full object-cover sm:h-32" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
          <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow sm:text-2xl">{rest?.name}</h1>
          <div className="flex gap-2">
            <Link href="/merchant/menu" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-sm font-medium text-gray-900 shadow hover:bg-white" style={{ color: "#111827" }}>
              <Utensils className="h-4 w-4" aria-hidden /> Menu
            </Link>
            <Link href="/merchant/stats" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-sm font-medium text-gray-900 shadow hover:bg-white" style={{ color: "#111827" }}>
              <BarChart3 className="h-4 w-4" aria-hidden /> Stats
            </Link>
          </div>
        </div>
      </div>

      <nav aria-label="Filtrer les commandes" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = filterOrders(orders, t.key).length;
          return (
            <Link
              key={t.key}
              href={`/merchant?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              data-tab={t.key}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
              )}
              style={active ? { color: "#fff" } : undefined}
            >
              {t.label}
              {t.key !== "history" && (
                <span className={cn("min-w-5 rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : count ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-500")}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/empty-merchant.png" alt="" className="mx-auto h-24 w-24 object-contain" />
          <p className="mt-3 text-sm text-gray-600">{current.empty}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Stagger>
            {visible.slice(0, tab === "history" ? 30 : 100).map((o) => (
              <article key={o.id} data-order-id={o.id} className="card-elevated flex flex-col gap-3 border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">Commande #{o.id.slice(-6)}</div>
                    <div className="text-xs text-gray-600">
                      {formatDateFr(o.createdAt)} · {articleCountLabel(o.items)} · {formatPriceUSD(o.totalUsd)}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{statusLabelFr(o.status)}</span>
                </div>
                <div className="flex gap-3">
                  <SafeImage
                    src={o.items[0]?.imageUrl || rest?.imageUrl}
                    alt={o.items[0]?.name || rest?.name || "Article"}
                    width={160}
                    height={120}
                    className="h-16 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <ul className="min-w-0 flex-1 text-sm">
                    {o.items.slice(0, 4).map((it) => (
                      <li key={it.id} className="flex justify-between gap-2">
                        <span className="truncate">{it.name}</span>
                        <span className="shrink-0 tabular-nums text-gray-600">× {it.quantity}</span>
                      </li>
                    ))}
                    {o.items.length > 4 && <li className="text-xs text-gray-500">+ {o.items.length - 4} autre(s)</li>}
                  </ul>
                </div>
                {TAB_STATUSES.ready.includes(o.status) && (
                  <div className="text-xs text-gray-600">
                    {o.riderId ? <>Livreur : <span className="font-medium text-gray-900">{riderName.get(o.riderId) ?? "assigné"}</span></> : "Recherche d’un livreur en cours…"}
                  </div>
                )}
                {o.status === "placed" && (
                  <MerchantActionButton orderId={o.id} action="merchant_accept">Accepter la commande</MerchantActionButton>
                )}
                {o.status === "restaurant_accepted" && (
                  <MerchantActionButton orderId={o.id} action="merchant_preparing">Lancer la préparation</MerchantActionButton>
                )}
                {o.status === "preparing" && (
                  <MerchantActionButton orderId={o.id} action="merchant_ready">Prête : appeler un livreur</MerchantActionButton>
                )}
              </article>
            ))}
          </Stagger>
        </div>
      )}
    </div>
  );
}
