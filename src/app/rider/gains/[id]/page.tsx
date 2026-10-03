import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/src/lib/auth";
import { getRestaurant, getOrder, listRiderPayouts } from "@/src/lib/data/db";
import { AccessRequired } from "@/src/components/AccessRequired";
import { SafeImage } from "@/src/components/SafeImage";
import { RIDER_DELIVERY_SHARE, riderEarningsUsd } from "@/src/lib/earnings";
import { payoutProviderLabel } from "@/src/lib/payouts";
import { formatDrcPhone } from "@/src/lib/phone";
import { articleCountLabel, cn, formatDateFr, formatPriceUSD, paymentLabelFr, statusLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Course #${id.slice(-6)}` };
}

export default async function RiderCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["rider"]);
  if (!user || !user.riderId) return <AccessRequired role="livreur" />;
  const { id } = await params;
  const order = await getOrder(id);
  if (!order || order.riderId !== user.riderId) return notFound();
  if (order.status !== "delivered" && order.status !== "cancelled") return notFound();

  const [restaurant, payouts] = await Promise.all([
    order.restaurantId ? getRestaurant(order.restaurantId) : Promise.resolve(undefined),
    listRiderPayouts(user.riderId),
  ]);
  const pickup = restaurant?.name ?? "Dépôt Trouvailles";
  const earned = order.status === "delivered" ? (order.riderEarningUsd ?? riderEarningsUsd(order.deliveryFeeUsd)) : 0;
  const sharePct = order.deliveryFeeUsd > 0 ? Math.round((earned / order.deliveryFeeUsd) * 100) : Math.round(RIDER_DELIVERY_SHARE * 100);
  const open = payouts.find((p) => p.status === "requested" && p.orderIds.includes(order.id));
  const paidVia = order.riderPaidAt
    ? payouts.find((p) => p.status === "paid" && p.orderIds.includes(order.id))
    : undefined;

  return (
    <div className="py-2">
      <Link href="/rider/gains" className="inline-flex items-center gap-1 text-sm font-medium text-gray-600">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Courses terminées
      </Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {pickup} → {order.zone}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            #{order.id.slice(-6)} · {formatDateFr(order.updatedAt)} · {articleCountLabel(order.items)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-extrabold tabular-nums text-emerald-800">{order.status === "delivered" ? `+${formatPriceUSD(earned)}` : "—"}</div>
          <div className="text-xs text-gray-500">{statusLabelFr(order.status)}</div>
        </div>
      </div>

      {order.status === "delivered" && (
        <div className={cn("mt-4 rounded-2xl border px-4 py-3 text-sm", order.riderPaidAt ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
          <div className="font-semibold">{order.riderPaidAt ? "Versé" : open ? "Retrait demandé" : "En attente de versement"}</div>
          <p className="mt-1 text-gray-700">
            Frais de livraison {formatPriceUSD(order.deliveryFeeUsd)} · ta part {sharePct} %, soit {formatPriceUSD(earned)}.
          </p>
          {order.riderPaidAt && <p className="mt-1 text-gray-700">Marqué versé le {formatDateFr(order.riderPaidAt)}.</p>}
          {open && (
            <p className="mt-1 text-gray-700">
              {formatPriceUSD(open.amountUsd)} vers {formatDrcPhone(open.phone)} · {payoutProviderLabel(open.provider)}.
            </p>
          )}
          {paidVia && !open && (
            <p className="mt-1 text-gray-700">
              Envoyé sur {formatDrcPhone(paidVia.phone)} · {payoutProviderLabel(paidVia.provider)}.
            </p>
          )}
        </div>
      )}

      <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold">La course</h2>
        <dl className="divide-y divide-gray-100 text-sm">
          <Row label="Retrait" value={`${pickup}${restaurant?.zone ? ` · ${restaurant.zone}` : ""}`} />
          <Row label="Livraison" value={`${order.address}${order.zone ? `, ${order.zone}` : ""}`} />
          {order.addressNotes && <Row label="Repère" value={order.addressNotes} />}
          {order.customerPhone && <Row label="Téléphone" value={formatDrcPhone(order.customerPhone)} />}
          <Row label="Paiement client" value={paymentLabelFr(order.paymentMethod)} />
          <Row label="Total commande" value={formatPriceUSD(order.totalUsd)} />
        </dl>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold">Articles</h2>
        <ul className="divide-y divide-gray-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 p-4">
              <SafeImage src={it.imageUrl} alt={it.name} width={96} height={72} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{it.name}</div>
                <div className="text-sm text-gray-600">×{it.quantity}</div>
              </div>
              <div className="shrink-0 text-sm font-medium tabular-nums">{formatPriceUSD(it.unitPriceUsd * it.quantity)}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 px-4 py-3">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
