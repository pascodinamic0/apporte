import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { listRiderPayouts, listRiders } from "@/src/lib/data/db";
import { AccessRequired } from "@/src/components/AccessRequired";
import { payoutProviderLabel } from "@/src/lib/payouts";
import { formatDrcPhone } from "@/src/lib/phone";
import { cn, formatDateFr, formatPriceUSD } from "@/src/lib/utils";
import type { RiderPayoutStatus } from "@/src/lib/types";
import { Panel } from "../parts";
import { SettleButton } from "./SettleButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Versements" };

const FILTERS: { key: RiderPayoutStatus | "all"; label: string }[] = [
  { key: "requested", label: "Demandés" },
  { key: "paid", label: "Versés" },
  { key: "rejected", label: "Refusés" },
  { key: "all", label: "Tous" },
];

export default async function AdminPayouts({ searchParams }: { searchParams?: Promise<{ f?: string }> }) {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const sp = (await searchParams) || {};
  const f = FILTERS.some((x) => x.key === sp.f) ? (sp.f as RiderPayoutStatus | "all") : "requested";
  const [all, riders] = await Promise.all([listRiderPayouts(), listRiders()]);
  const names = new Map(riders.map((r) => [r.id, r.name]));
  const list = f === "all" ? all : all.filter((p) => p.status === f);

  return (
    <div>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Versements</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((x) => {
          const n = x.key === "all" ? all.length : all.filter((p) => p.status === x.key).length;
          const active = f === x.key;
          return (
            <Link
              key={x.key}
              href={x.key === "requested" ? "/admin/versements" : `/admin/versements?f=${x.key}`}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm", active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700")}
              style={active ? { color: "#fff" } : undefined}
            >
              {x.label} <span className="tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </div>
      <Panel title={`${list.length} retrait${list.length > 1 ? "s" : ""}`}>
        {list.length === 0 ? (
          <p className="p-4 text-sm text-gray-600">Aucun retrait dans cette catégorie.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((p) => (
              <li key={p.id} className="grid gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold tabular-nums">{formatPriceUSD(p.amountUsd)}</div>
                    <div className="mt-0.5 text-sm text-gray-700">
                      <Link href={`/admin/livreurs/${p.riderId}`} className="font-medium">
                        {names.get(p.riderId) ?? p.riderId}
                      </Link>
                      {" · "}
                      {formatDrcPhone(p.phone)} · {payoutProviderLabel(p.provider)}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {formatDateFr(p.createdAt)} · {p.orderIds.length} course{p.orderIds.length > 1 ? "s" : ""}
                      {p.paidAt ? ` · versé le ${formatDateFr(p.paidAt)}` : ""}
                    </div>
                  </div>
                  {p.status === "requested" && <SettleButton id={p.id} />}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {p.orderIds.map((id) => (
                    <Link key={id} href={`/order/${id}`} className="rounded-full bg-gray-100 px-2.5 py-1 font-medium">
                      #{id.slice(-6)}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
