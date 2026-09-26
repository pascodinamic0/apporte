import type { Metadata } from "next";
import { listRiders } from "@/src/lib/data/db";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { cn, formatPriceUSD, riderStatusLabelFr } from "@/src/lib/utils";
import { Panel } from "../parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Livreurs" };

const tone: Record<string, string> = {
  online: "bg-emerald-50 text-emerald-800",
  busy: "bg-amber-50 text-amber-800",
  offline: "bg-gray-100 text-gray-600",
};

export default async function AdminRiders() {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const riders = await listRiders();
  return (
    <div>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Livreurs</h1>
      <Panel title={`${riders.length} livreurs · ${riders.filter((r) => r.status !== "offline").length} en service`}>
        <ul className="divide-y divide-gray-100">
          {riders.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{r.name}</div>
                <div className="text-xs text-gray-600">Fiabilité {r.reliabilityPercent} % · gains du jour {formatPriceUSD(r.earningsTodayUsd)}</div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", tone[r.status] || tone.offline)}>{riderStatusLabelFr(r.status)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
