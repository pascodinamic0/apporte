import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireRole } from "@/src/lib/auth";
import { listOrdersForRider, listRiderPayouts } from "@/src/lib/data/db";
import { riderEarnings } from "@/src/lib/data/ops";
import { getFeeSettings } from "@/src/lib/data/settings";
import { AccessRequired } from "@/src/components/AccessRequired";
import { lockedPayoutOrderIds, payoutProviderLabel, selectWithdrawable } from "@/src/lib/payouts";
import { formatDrcPhone } from "@/src/lib/phone";
import { cn, formatDateFr, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gains" };

export default async function RiderEarningsPage() {
  const user = await requireRole(["rider"]);
  if (!user || !user.riderId) return <AccessRequired role="livreur" />;
  const [map, fees, orders, payouts] = await Promise.all([
    riderEarnings([user.riderId]),
    getFeeSettings(),
    listOrdersForRider(user.riderId),
    listRiderPayouts(user.riderId),
  ]);
  const e = map[user.riderId];
  const trips = e.trips.filter((t) => t.status === "delivered" || t.status === "cancelled");
  const paidById = new Map(orders.map((o) => [o.id, o.riderPaidAt]));
  const openPayouts = payouts.filter((p) => p.status === "requested");
  const locked = lockedPayoutOrderIds(openPayouts);
  const withdrawable = selectWithdrawable(orders, locked);

  return (
    <div className="py-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Gains</h1>
      <p className="mt-1 text-sm text-gray-600">
        Tu gardes {fees.riderSharePct} % des frais de livraison. Retire le solde en attente : l’équipe Apporte l’envoie sur ton Mobile Money.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Aujourd’hui" value={formatPriceUSD(e.todayUsd)} hint={`${e.tripsToday} course${e.tripsToday > 1 ? "s" : ""}`} />
        <Stat label="7 jours" value={formatPriceUSD(e.weekUsd)} hint={`${e.tripsWeek}`} />
        <Stat label="Total" value={formatPriceUSD(e.totalUsd)} hint={`${e.tripsTotal}`} />
      </div>

      {openPayouts.map((p) => (
        <div key={p.id} className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <div className="font-semibold text-amber-950">Retrait de {formatPriceUSD(p.amountUsd)} demandé</div>
          <p className="mt-1 text-amber-900">
            {formatDrcPhone(p.phone)} · {payoutProviderLabel(p.provider)} · {formatDateFr(p.createdAt)}
          </p>
        </div>
      ))}
      {withdrawable.amountUsd > 0 && (
        <Link
          href="/rider/gains/retirer"
          className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-emerald-700 text-base font-semibold text-white"
          style={{ color: "#fff" }}
        >
          Retirer {formatPriceUSD(withdrawable.amountUsd)}
        </Link>
      )}

      <h2 className="mb-2 mt-6 text-lg font-semibold">Courses terminées</h2>
      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <img src="/images/empty-rider.png" alt="" className="mx-auto h-24 w-24 object-contain" />
          <p className="mt-3 text-sm text-gray-600">Aucune course terminée.</p>
          <Link href="/rider" className="mt-2 inline-block text-sm font-medium text-emerald-800">Voir les courses</Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white" data-testid="rider-trips">
          {trips.map((t) => {
            const paidAt = paidById.get(t.orderId);
            const requested = locked.has(t.orderId);
            return (
              <li key={t.orderId} className="border-b border-gray-100 last:border-0">
                <Link href={`/rider/gains/${t.orderId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50" style={{ color: "inherit" }}>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.pickupName} → {t.zone}</div>
                    <div className="text-xs text-gray-600">#{t.orderId.slice(-6).toUpperCase()} · {formatDateFr(t.deliveredAt || t.createdAt)} · frais {formatPriceUSD(t.deliveryFeeUsd)}</div>
                    {t.status === "delivered" && (
                      <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", paidAt ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                        {paidAt ? "Versé" : requested ? "Retrait demandé" : "En attente"}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="text-right">
                      <div className="font-semibold text-emerald-800">{t.status === "delivered" ? `+${formatPriceUSD(t.earningUsd)}` : "—"}</div>
                      <div className="text-xs text-gray-500">{statusLabelFr(t.status)}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-extrabold tabular-nums sm:text-xl">{value}</div>
      <div className="text-xs text-gray-500">{hint}</div>
    </div>
  );
}
