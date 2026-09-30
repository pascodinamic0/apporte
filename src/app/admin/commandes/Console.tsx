"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { useLive } from "@/src/lib/client/live";
import { LiveBadge } from "@/src/components/LiveBadge";
import { cn, formatDateFr, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";
import type { Order, OrderStatus } from "@/src/lib/types";

type Row = Omit<Order, "pin">;
type Rest = { id: string; name: string };
type RiderOpt = { id: string; name: string; status: string; suspended?: boolean };
const FILTERS: { key: string; label: string }[] = [
  { key: "active", label: "En cours" },
  { key: "new", label: "Nouvelles" },
  { key: "kitchen", label: "Cuisine" },
  { key: "delivery", label: "Livraison" },
  { key: "delivered", label: "Livrées" },
  { key: "cancelled", label: "Annulées" },
  { key: "refund", label: "Remboursement" },
  { key: "all", label: "Toutes" },
];

function tone(status: OrderStatus) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  if (status === "placed") return "bg-blue-50 text-blue-800";
  return "bg-amber-50 text-amber-800";
}

export function AdminConsole() {
  const [f, setF] = useState("active");
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [orders, setOrders] = useState<Row[]>([]);
  const [restaurants, setRestaurants] = useState<Rest[]>([]);
  const [riders, setRiders] = useState<RiderOpt[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("Annulée par le support");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin?view=orders&f=${encodeURIComponent(f)}&q=${encodeURIComponent(qLive)}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data.orders || []);
    setRestaurants(data.restaurants || []);
    setRiders(data.riders || []);
  }, [f, qLive]);

  useEffect(() => { void load(); }, [load]);
  const { connected } = useLive(["admin"], () => void load(), { pollMs: 12_000, fastPollMs: 4_000 });

  const names = new Map(restaurants.map((r) => [r.id, r.name]));
  const riderName = new Map(riders.map((r) => [r.id, r.name]));
  const selected = orders.find((o) => o.id === open) || null;

  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_state: "Cette commande ne peut plus être modifiée.",
          rider_busy: "Ce livreur a déjà une course.",
          rider_suspended: "Ce livreur est suspendu.",
          rider_not_found: "Livreur introuvable.",
        };
        toast.error(map[data.reason] || "Action impossible.");
        return;
      }
      toast.success(ok);
      setNote("");
      await load();
    } catch {
      toast.error("Connexion perdue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Commandes</h1>
          <p className="mt-1 text-sm text-gray-600">Annuler, réassigner, noter, signaler un remboursement.</p>
        </div>
        <LiveBadge connected={connected} />
      </div>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setQLive(q.trim()); }}
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° de commande, adresse, téléphone, plat"
            className="h-11 w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 text-base outline-none focus:border-emerald-600"
            data-testid="admin-search"
          />
        </label>
        <button type="submit" className="h-11 shrink-0 rounded-full bg-gray-900 px-4 text-sm font-semibold text-white">Chercher</button>
      </form>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setF(x.key)}
            className={cn("h-9 shrink-0 rounded-full border px-3 text-sm font-medium", f === x.key ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700")}
            data-filter={x.key}
          >
            {x.label}
          </button>
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">Aucune commande dans cette vue.</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" data-testid="admin-orders">
          {orders.map((o) => (
            <li key={o.id} className="border-b border-gray-100 last:border-0">
              <button type="button" onClick={() => setOpen(o.id === open ? null : o.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50" data-order-id={o.id}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">#{o.id.slice(-6).toUpperCase()} · {o.restaurantId ? names.get(o.restaurantId) || "Restaurant" : "Trouvailles"}</div>
                  <div className="truncate text-xs text-gray-600">{formatDateFr(o.createdAt)} · {o.zone} · {o.address}{o.status === "cancelled" && o.cancelReason ? ` · ${o.cancelReason}` : ""}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold tabular-nums">{formatPriceUSD(o.totalUsd)}</div>
                  <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", tone(o.status))}>{statusLabelFr(o.status)}</span>
                  {o.refundFlag && <div className="mt-1 text-[11px] font-semibold text-red-700">Remboursement</div>}
                </div>
              </button>
              {selected?.id === o.id && (
                <div className="grid gap-4 border-t border-gray-100 bg-gray-50 px-4 py-4 lg:grid-cols-[1.2fr_.8fr]">
                  <div>
                    <ul className="text-sm">
                      {o.items.map((it) => (
                        <li key={it.id} className="flex justify-between gap-3 py-0.5"><span className="truncate">{it.quantity}× {it.name}</span><span className="tabular-nums text-gray-600">{formatPriceUSD(it.unitPriceUsd * it.quantity)}</span></li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-gray-600" data-testid={o.cancelReason ? "admin-cancel-reason" : undefined}>
                      {o.customerPhone || "Pas de téléphone"} · livreur {o.riderId ? riderName.get(o.riderId) || "assigné" : "aucun"}
                      {o.cancelReason ? ` · Motif : ${o.cancelReason}` : ""}
                    </p>
                    {o.supportNotes && o.supportNotes.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-gray-700">
                        {o.supportNotes.map((n) => <li key={n.id} className="rounded-lg bg-white px-2 py-1">{n.note}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {o.status !== "delivered" && o.status !== "cancelled" && (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void act({ action: "cancel", orderId: o.id, reason }, "Commande annulée"); }}>
                        <input value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm" aria-label="Motif d’annulation" />
                        <button disabled={busy} className="h-10 shrink-0 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white" data-testid="admin-cancel">Annuler</button>
                      </form>
                    )}
                    <label className="text-xs font-medium text-gray-600">
                      Réassigner le livreur
                      <select
                        className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm"
                        defaultValue={o.riderId || ""}
                        onChange={(e) => void act({ action: "reassign", orderId: o.id, riderId: e.target.value || null }, e.target.value ? "Livreur réassigné" : "Remise en recherche")}
                        data-testid="admin-reassign"
                      >
                        <option value="">Remettre en recherche</option>
                        {riders.filter((r) => !r.suspended).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.status}</option>)}
                      </select>
                    </label>
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void act({ action: "note", orderId: o.id, note }, "Note ajoutée"); }}>
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note interne" className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm" aria-label="Note interne" />
                      <button disabled={busy || !note.trim()} className="h-10 shrink-0 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold">Noter</button>
                    </form>
                    <button
                      type="button"
                      disabled={busy}
                      data-testid="admin-refund"
                      onClick={() => void act({ action: "refund", orderId: o.id, flag: !o.refundFlag, note: o.refundFlag ? "" : "À rembourser" }, o.refundFlag ? "Signalement retiré" : "Remboursement signalé")}
                      className={cn("h-10 rounded-lg text-sm font-semibold", o.refundFlag ? "bg-gray-200 text-gray-800" : "bg-amber-400 text-gray-900")}
                    >
                      {o.refundFlag ? "Retirer le signalement de remboursement" : "Signaler un remboursement"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
