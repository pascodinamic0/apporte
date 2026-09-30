import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { riderEarnings } from "@/src/lib/data/ops";
import { getFeeSettings } from "@/src/lib/data/settings";
import { formatDateFr, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gains" };

export default async function RiderEarningsPage() {
  const user = await requireRole(["rider"]);
  if (!user || !user.riderId) return <AccessRequired role="livreur" />;
  const [map, fees] = await Promise.all([riderEarnings([user.riderId]), getFeeSettings()]);
  const e = map[user.riderId];
  const trips = e.trips.filter((t) => t.status === "delivered" || t.status === "cancelled");
  return (
    <div className="py-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Gains</h1>
      <p className="mt-1 text-sm text-gray-600">Tu gardes {fees.riderSharePct} % des frais de livraison. Le reste revient à la plateforme.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Aujourd’hui" value={formatPriceUSD(e.todayUsd)} hint={`${e.tripsToday} course${e.tripsToday > 1 ? "s" : ""}`} />
        <Stat label="7 jours" value={formatPriceUSD(e.weekUsd)} hint={`${e.tripsWeek}`} />
        <Stat label="Total" value={formatPriceUSD(e.totalUsd)} hint={`${e.tripsTotal}`} />
      </div>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Courses</h2>
      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <img src="/images/empty-rider.png" alt="" className="mx-auto h-24 w-24 object-contain" />
          <p className="mt-3 text-sm text-gray-600">Aucune course terminée.</p>
          <Link href="/rider" className="mt-2 inline-block text-sm font-medium text-emerald-800">Voir les courses</Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white" data-testid="rider-trips">
          {trips.map((t) => (
            <li key={t.orderId} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0">
              <div className="min-w-0">
                <div className="truncate font-medium">{t.pickupName} → {t.zone}</div>
                <div className="text-xs text-gray-600">#{t.orderId.slice(-6).toUpperCase()} · {formatDateFr(t.deliveredAt || t.createdAt)} · frais {formatPriceUSD(t.deliveryFeeUsd)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold text-emerald-800">{t.status === "delivered" ? `+${formatPriceUSD(t.earningUsd)}` : "—"}</div>
                <div className="text-xs text-gray-500">{statusLabelFr(t.status)}</div>
              </div>
            </li>
          ))}
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
