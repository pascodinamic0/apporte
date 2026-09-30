import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { getOrder, getRestaurant } from "@/src/lib/data/db";
import { getFeeSettings } from "@/src/lib/data/settings";
import { vatIncluded } from "@/src/lib/fees";
import { formatDateFr, formatPriceUSD, paymentLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reçu", robots: { index: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const order = await getOrder(id);
  if (!user || !order) notFound();
  const allowed = user.id === order.customerId || user.role === "admin" || (user.role === "merchant" && user.merchantId === order.restaurantId);
  if (!allowed) notFound();
  const [rest, fees] = await Promise.all([
    order.restaurantId ? getRestaurant(order.restaurantId) : Promise.resolve(undefined),
    getFeeSettings(),
  ]);
  const vat = order.vatUsd ?? vatIncluded(order.totalUsd, fees.vatPct);
  const ex = Math.round((order.totalUsd - vat) * 100) / 100;
  return (
    <div className="mx-auto max-w-lg py-2">
      <Link href={`/order/${order.id}`} className="text-sm font-medium text-emerald-800">← Suivi de commande</Link>
      <article className="mt-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="receipt">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Apporte · Kinshasa</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Reçu</h1>
            <p className="text-sm text-gray-600">{rest?.name || "Trouvailles"} · {formatDateFr(order.createdAt)}</p>
          </div>
          <div className="text-right text-xs text-gray-500">#{order.id.slice(-6).toUpperCase()}</div>
        </div>
        <ul className="mt-5 divide-y divide-gray-100 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3 py-2">
              <span>{it.quantity}× {it.name}</span>
              <span className="tabular-nums">{formatPriceUSD(it.unitPriceUsd * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 text-sm">
          <Row k="Sous-total" v={formatPriceUSD(order.subtotalUsd)} />
          <Row k={`Livraison · ${order.zone}`} v={formatPriceUSD(order.deliveryFeeUsd)} />
          <Row k="Total TTC" v={formatPriceUSD(order.totalUsd)} strong />
          <Row k="dont hors TVA" v={formatPriceUSD(ex)} />
          <Row k={`dont TVA ${fees.vatPct} %`} v={formatPriceUSD(vat)} testId="receipt-vat" />
        </dl>
        <p className="mt-4 text-xs text-gray-500">
          {paymentLabelFr(order.paymentMethod)}. Prix TTC. TVA de {fees.vatPct} % incluse, calculée sur le total.
          {order.address ? ` Livré à ${order.address}.` : ""}
        </p>
      </article>
    </div>
  );
}

function Row({ k, v, strong, testId }: { k: string; v: string; strong?: boolean; testId?: string }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-gray-200 pt-2 text-base font-bold" : "text-gray-700"}`}>
      <dt>{k}</dt>
      <dd className="tabular-nums" data-testid={testId}>{v}</dd>
    </div>
  );
}
