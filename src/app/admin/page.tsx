import type { Metadata } from "next";
import Link from "next/link";
import { listRiders, getRestaurants, listOrdersAll } from "@/src/lib/data/db";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { formatPriceUSD } from "@/src/lib/utils";
import { OrderRow, Panel } from "./parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vue d’ensemble" };

const ACTIVE = ["placed", "restaurant_accepted", "preparing", "rider_searching", "rider_assigned", "going_to_restaurant", "arrived", "picked_up", "delivering"];

/** Start of the current day in Kinshasa (UTC+1), as epoch ms. */
function kinshasaStartOfDay(now = new Date()) {
  const k = new Date(now.getTime() + 3600_000);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 3600_000;
}

export default async function AdminPage() {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const [orders, riders, restaurants] = await Promise.all([listOrdersAll(), listRiders(), getRestaurants()]);
  const names = new Map(restaurants.map((r) => [r.id, r.name]));
  const sod = kinshasaStartOfDay();
  const today = orders.filter((o) => o.createdAt >= sod);
  const deliveredToday = today.filter((o) => o.status === "delivered");
  const gmvToday = deliveredToday.reduce((s, o) => s + o.totalUsd, 0);
  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const o of today) byHour[new Date(o.createdAt + 3600_000).getUTCHours()]++;
  const max = Math.max(1, ...byHour);

  return (
    <div>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Vue d’ensemble</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat title="Commandes en cours" value={String(active.length)} href="/admin/commandes?f=active" />
        <Stat title="Livrées aujourd’hui" value={String(deliveredToday.length)} href="/admin/commandes?f=delivered" />
        <Stat title="Ventes livrées (jour)" value={formatPriceUSD(gmvToday)} />
        <Stat title="Livreurs en ligne" value={`${riders.filter((r) => r.status !== "offline").length} / ${riders.length}`} href="/admin/livreurs" />
      </div>
      <section className="card-elevated mt-3 border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Commandes par heure (aujourd’hui)</span>
          <span className="text-gray-500">{today.length} au total</span>
        </div>
        <div className="flex h-20 items-end gap-[3px]" role="img" aria-label="Histogramme des commandes par heure">
          {byHour.map((v, h) => (
            <div key={h} className="flex-1 rounded-t bg-emerald-600/80" style={{ height: `${Math.max(v ? 8 : 2, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }} title={`${h}h : ${v}`} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-gray-400"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Commandes en cours" action={<Link href="/admin/commandes" className="text-sm font-medium">Tout voir</Link>}>
          {active.length === 0 ? (
            <p className="p-4 text-sm text-gray-600">Aucune commande en cours.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {active.slice(0, 6).map((o) => <OrderRow key={o.id} o={o} restaurantName={o.restaurantId ? names.get(o.restaurantId) : undefined} />)}
            </ul>
          )}
        </Panel>
        <Panel title="Dernières commandes" action={<Link href="/admin/commandes?f=all" className="text-sm font-medium">Historique</Link>}>
          <ul className="divide-y divide-gray-100">
            {orders.slice(0, 6).map((o) => <OrderRow key={o.id} o={o} restaurantName={o.restaurantId ? names.get(o.restaurantId) : undefined} />)}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ title, value, href }: { title: string; value: string; href?: string }) {
  const inner = (
    <>
      <div className="text-xs font-medium text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
    </>
  );
  const cls = "card-elevated block border border-gray-200 bg-white p-4";
  return href ? <Link href={href} className={`${cls} hover:border-emerald-300`} style={{ color: "inherit" }}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
