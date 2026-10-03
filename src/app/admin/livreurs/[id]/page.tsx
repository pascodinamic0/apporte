import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRider, getUserForRider, listOrdersForRider } from "@/src/lib/data/db";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { formatDrcPhone } from "@/src/lib/phone";
import { summarizeRiderEarnings } from "@/src/lib/earnings";
import { cn, formatPriceUSD, riderStatusLabelFr } from "@/src/lib/utils";
import { OrderRow, Panel } from "../../parts";
import { PayoutButton } from "./PayoutButton";

export const dynamic = "force-dynamic";

const tone: Record<string, string> = {
  online: "bg-emerald-50 text-emerald-800",
  busy: "bg-amber-50 text-amber-800",
  offline: "bg-gray-100 text-gray-600",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const rider = await getRider(id);
  return { title: rider ? rider.name : "Livreur introuvable" };
}

export default async function AdminRiderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const { id } = await params;
  const rider = await getRider(id);
  if (!rider) return notFound();
  const [account, orders] = await Promise.all([getUserForRider(rider.id), listOrdersForRider(rider.id)]);
  const today = summarizeRiderEarnings(orders, "today");
  const all = summarizeRiderEarnings(orders, "all");
  const phoneLabel = rider.phone ? formatDrcPhone(rider.phone) : "";
  const maps = `https://www.google.com/maps?q=${rider.latitude},${rider.longitude}`;

  return (
    <div>
      <Link href="/admin/livreurs" className="mb-3 inline-flex text-sm font-medium text-gray-600 hover:text-gray-900">
        ← Livreurs
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{rider.name}</h1>
          <p className="text-xs text-gray-500">{rider.id}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", tone[rider.status] || tone.offline)}>
          {riderStatusLabelFr(rider.status)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Contact">
          {rider.phone || rider.email ? (
            <dl className="divide-y divide-gray-100 text-sm">
              <Row label="Téléphone">
                {rider.phone ? (
                  <a href={`tel:${rider.phone}`} className="font-medium text-emerald-800">
                    {phoneLabel}
                  </a>
                ) : (
                  <span className="text-gray-500">Non renseigné</span>
                )}
              </Row>
              <Row label="E-mail">
                {rider.email ? (
                  <a href={`mailto:${rider.email}`} className="break-all font-medium text-emerald-800">
                    {rider.email}
                  </a>
                ) : (
                  <span className="text-gray-500">Non renseigné</span>
                )}
              </Row>
            </dl>
          ) : (
            <p className="p-4 text-sm text-gray-600">Aucun téléphone ni e-mail. Une course qui bloque, et tu n’as personne à joindre.</p>
          )}
        </Panel>

        <Panel title="Fiche">
          <dl className="divide-y divide-gray-100 text-sm">
            <Row label="Fiabilité">{rider.reliabilityPercent} %</Row>
            <Row label="Gains du jour">{formatPriceUSD(today.earned)}</Row>
            <Row label="En attente">{formatPriceUSD(all.pending)}</Row>
            <Row label="Versé">{formatPriceUSD(all.paid)}</Row>
            <Row label="Position">
              <a href={maps} target="_blank" rel="noreferrer" className="font-medium text-emerald-800">
                {rider.latitude.toFixed(4)}, {rider.longitude.toFixed(4)}
              </a>
            </Row>
            <Row label="Compte">
              {account ? (
                <span>
                  {account.name}
                  {account.email && account.email !== rider.email ? <span className="block text-xs text-gray-500">{account.email}</span> : null}
                </span>
              ) : (
                <span className="text-gray-500">Aucun compte lié</span>
              )}
            </Row>
          </dl>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title={`${orders.length} course${orders.length > 1 ? "s" : ""}`}>
          {orders.length === 0 ? (
            <p className="p-4 text-sm text-gray-600">Aucune course enregistrée.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {orders.slice(0, 30).map((o) => (
                <OrderRow
                  key={o.id}
                  o={o}
                  extra={o.status === "delivered" ? (
                    <div className="-mt-1 px-4 pb-3 text-right">
                      <PayoutButton orderId={o.id} paid={!!o.riderPaidAt} />
                    </div>
                  ) : undefined}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-gray-600">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}
