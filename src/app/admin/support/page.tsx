import type { Metadata } from "next";
import Link from "next/link";
import { listSupportRequests } from "@/src/lib/data/db";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { cn, formatDateFr, roleLabelFr } from "@/src/lib/utils";
import type { SupportRequestStatus } from "@/src/lib/types";
import { Panel } from "../parts";
import { StatusForm } from "./StatusForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support" };

const FILTERS: { key: SupportRequestStatus | "all"; label: string }[] = [
  { key: "open", label: "Ouvertes" },
  { key: "in_progress", label: "En cours" },
  { key: "resolved", label: "Résolues" },
  { key: "all", label: "Toutes" },
];

export default async function AdminSupport({ searchParams }: { searchParams?: Promise<{ f?: string }> }) {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const sp = (await searchParams) || {};
  const f = FILTERS.some((x) => x.key === sp.f) ? sp.f! : "open";
  const all = await listSupportRequests();
  const list = f === "all" ? all : all.filter((r) => r.status === f);

  return (
    <div>
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Support</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((x) => {
          const n = x.key === "all" ? all.length : all.filter((r) => r.status === x.key).length;
          const active = f === x.key;
          return (
            <Link
              key={x.key}
              href={x.key === "open" ? "/admin/support" : `/admin/support?f=${x.key}`}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm", active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700")}
              style={active ? { color: "#fff" } : undefined}
            >
              {x.label} <span className="tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </div>
      <Panel title={`${list.length} demande${list.length > 1 ? "s" : ""}`}>
        {list.length === 0 ? (
          <p className="p-4 text-sm text-gray-600">Aucune demande dans cette catégorie.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((r) => (
              <li key={r.id} className={cn("grid gap-2 p-4", r.priority === "urgent" && "bg-red-50/70")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {r.priority === "urgent" && <span className="mr-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Urgence</span>}
                      {r.topic}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-600">
                      {r.userName} · {roleLabelFr(r.role)} · {formatDateFr(r.createdAt)}
                      {r.orderId ? (
                        <>
                          {" "}· <Link href={`/order/${r.orderId}`} className="font-medium">commande #{r.orderId.slice(-6)}</Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <StatusForm id={r.id} status={r.status} />
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{r.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
