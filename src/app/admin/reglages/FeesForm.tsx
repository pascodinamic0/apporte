"use client";
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import type { FeeSettings, Zone } from "@/src/lib/fees";
import { formatPriceUSD } from "@/src/lib/utils";

export function FeesForm({ initialFees, initialZones }: { initialFees: FeeSettings; initialZones: Zone[] }) {
  const [fees, setFees] = useState(initialFees);
  const [zones, setZones] = useState(initialZones);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("3");

  async function saveFees(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fees", ...fees }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error("Pourcentages entre 0 et 100."); return; }
      setFees(data.fees || fees);
      toast.success("Réglages enregistrés");
    } finally { setBusy(false); }
  }

  async function saveZone(z: { id?: string; name: string; deliveryFeeUsd: number; active: boolean }) {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "zone", ...z }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error("Zone invalide. Frais entre 0 et 50 $."); return; }
    setZones((prev) => {
      const i = prev.findIndex((x) => x.id === data.zone.id);
      if (i < 0) return [...prev, data.zone];
      const next = [...prev];
      next[i] = data.zone;
      return next;
    });
    toast.success("Zone enregistrée");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={saveFees} className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">Commissions</h2>
        <p className="mt-1 text-sm text-gray-600">La TVA est incluse dans les prix et détaillée sur le reçu.</p>
        <div className="mt-4 grid gap-3">
          <Num label="Commission restaurant (%)" value={fees.commissionPct} onChange={(n) => setFees({ ...fees, commissionPct: n })} testId="fee-commission" />
          <Num label="Part du livreur sur les frais de livraison (%)" value={fees.riderSharePct} onChange={(n) => setFees({ ...fees, riderSharePct: n })} testId="fee-rider" />
          <Num label="TVA (%)" value={fees.vatPct} onChange={(n) => setFees({ ...fees, vatPct: n })} testId="fee-vat" />
        </div>
        <button disabled={busy} className="mt-4 h-11 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white" data-testid="save-fees">{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">Zones et frais de livraison</h2>
        <p className="mt-1 text-sm text-gray-600">Seules les zones actives acceptent des commandes. Gombe est à 2 $, jusqu’à 4 $ plus loin.</p>
        <ul className="mt-4 divide-y divide-gray-100">
          {zones.map((z) => (
            <li key={z.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-28 flex-1 font-medium">{z.name}</span>
              <label className="text-xs text-gray-600">Frais $
                <input
                  defaultValue={z.deliveryFeeUsd}
                  type="number"
                  min={0}
                  max={50}
                  step="0.5"
                  className="ml-1 h-9 w-20 rounded-lg border border-gray-200 px-2 text-sm"
                  aria-label={`Frais ${z.name}`}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n !== z.deliveryFeeUsd) void saveZone({ ...z, deliveryFeeUsd: n });
                  }}
                />
              </label>
              <button type="button" className="h-9 rounded-full border border-gray-300 px-3 text-xs font-semibold" onClick={() => void saveZone({ ...z, active: !z.active })}>
                {z.active ? "Servie" : "Inactive"} · {formatPriceUSD(z.deliveryFeeUsd)}
              </button>
            </li>
          ))}
        </ul>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void saveZone({ name, deliveryFeeUsd: Number(fee), active: false }); setName(""); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle zone" className="h-10 min-w-[140px] flex-1 rounded-full border border-gray-200 px-3 text-sm" aria-label="Nom de la zone" />
          <input value={fee} onChange={(e) => setFee(e.target.value)} type="number" min={0} max={50} step="0.5" className="h-10 w-24 rounded-full border border-gray-200 px-3 text-sm" aria-label="Frais de la zone" />
          <button className="h-10 rounded-full bg-gray-900 px-4 text-sm font-semibold text-white">Ajouter</button>
        </form>
      </section>
    </div>
  );
}

function Num({ label, value, onChange, testId }: { label: string; value: number; onChange: (n: number) => void; testId: string }) {
  return (
    <label className="text-sm font-medium text-gray-800">{label}
      <input data-testid={testId} type="number" min={0} max={100} step="0.5" value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 text-base" />
    </label>
  );
}
