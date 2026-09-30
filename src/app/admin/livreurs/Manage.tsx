"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Rider } from "@/src/lib/types";
import type { RiderEarnings } from "@/src/lib/data/ops";
import { cn, formatPriceUSD } from "@/src/lib/utils";

export function ManageRiders({ riders }: { riders: (Rider & { earnings: RiderEarnings })[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  async function create(fd: FormData) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rider_create", name: fd.get("name"), phone: fd.get("phone") }) });
      if (!res.ok) { toast.error("Nom trop court."); return; }
      toast.success("Livreur créé");
      (document.getElementById("new-rider") as HTMLFormElement)?.reset();
      router.refresh();
    } finally { setBusy(false); }
  }

  async function patch(id: string, body: Record<string, unknown>, ok: string) {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rider_update", id, ...body }) });
    if (!res.ok) { toast.error("Modification impossible."); return; }
    toast.success(ok);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Livreurs</h1>
      <p className="mt-1 mb-4 text-sm text-gray-600">Créer, suspendre, et voir les gains (80 % des frais de livraison, sauf réglage).</p>
      <form id="new-rider" className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void create(new FormData(e.currentTarget)); }}>
        <input name="name" required placeholder="Nom du livreur" className="h-11 min-w-[180px] flex-1 rounded-full border border-gray-200 px-4 text-base" aria-label="Nom du livreur" />
        <input name="phone" placeholder="Téléphone" className="h-11 w-40 rounded-full border border-gray-200 px-4 text-base" aria-label="Téléphone" />
        <button disabled={busy} className="h-11 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white" data-testid="add-rider">Ajouter</button>
      </form>
      <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {riders.map((r) => (
          <li key={r.id} className="border-b border-gray-100 last:border-0">
            <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)} data-testid={`rider-${r.id}`}>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-gray-600">{r.phone || "Pas de téléphone"} · {r.earnings.tripsToday} course{r.earnings.tripsToday > 1 ? "s" : ""} aujourd’hui</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums text-emerald-800">{formatPriceUSD(r.earnings.todayUsd)}</div>
                <span className={cn("text-[11px] font-semibold", r.suspended ? "text-red-700" : "text-gray-500")}>{r.suspended ? "Suspendu" : r.status}</span>
              </div>
            </button>
            {openId === r.id && (
              <div className="grid gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm sm:grid-cols-3">
                <div>Semaine <b className="tabular-nums">{formatPriceUSD(r.earnings.weekUsd)}</b> · {r.earnings.tripsWeek} courses</div>
                <div>Total <b className="tabular-nums">{formatPriceUSD(r.earnings.totalUsd)}</b> · {r.earnings.tripsTotal} courses</div>
                <div className="flex gap-2 sm:justify-end">
                  <button type="button" className="h-9 rounded-full border border-gray-300 bg-white px-3 text-sm font-semibold" onClick={() => void patch(r.id, { suspended: !r.suspended }, r.suspended ? "Livreur réactivé" : "Livreur suspendu")}>
                    {r.suspended ? "Réactiver" : "Suspendre"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
