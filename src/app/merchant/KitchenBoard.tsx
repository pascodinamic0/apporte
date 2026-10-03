"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BarChart3, BellRing, Bike, ChefHat, Clock, Inbox, Utensils, Volume2, VolumeX, CalendarClock, PackageCheck } from "lucide-react";
import { useLive } from "@/src/lib/client/live";
import { playChime, unlockAudio } from "@/src/lib/client/chime";
import { LiveBadge } from "@/src/components/LiveBadge";
import { SafeImage } from "@/src/components/SafeImage";
import { Sheet } from "@/src/components/ui/sheet";
import { Switch } from "@/src/components/ui/switch";
import { Button } from "@/src/components/ui/button";
import { cn, formatPriceUSD, statusLabelFr } from "@/src/lib/utils";
import type { Restaurant, OrderStatus } from "@/src/lib/types";
import type { BoardOrder } from "./board-types";
import { DeclineDialog } from "./DeclineDialog";

type ColKey = "new" | "kitchen" | "ready" | "history";
const COLS: { key: ColKey; label: string; short: string; statuses: OrderStatus[]; empty: string; icon: typeof Inbox }[] = [
  { key: "new", label: "Nouvelles", short: "Nouvelles", statuses: ["placed"], empty: "Aucune nouvelle commande.", icon: Inbox },
  { key: "kitchen", label: "En préparation", short: "Préparation", statuses: ["restaurant_accepted", "preparing"], empty: "Rien en cuisine.", icon: ChefHat },
  { key: "ready", label: "Prêtes", short: "Prêtes", statuses: ["rider_searching", "rider_assigned", "going_to_restaurant", "arrived"], empty: "Aucune commande en attente de livreur.", icon: PackageCheck },
  { key: "history", label: "Historique", short: "Historique", statuses: ["picked_up", "delivering", "delivered", "cancelled"], empty: "Aucune commande terminée.", icon: Clock },
];
const PREP_CHOICES = [10, 15, 20, 30, 45];
const CHIME_EVERY_MS = 6000;

function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}
function ago(ms: number, now: number) {
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if (m < 1) return "à l’instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h ${String(m % 60).padStart(2, "0")}`;
}
function timeFr(ms: number) {
  return new Date(ms).toLocaleTimeString("fr-FR", { timeZone: "Africa/Kinshasa", hour: "2-digit", minute: "2-digit" });
}

export function KitchenBoard({
  initialOrders,
  initialRestaurant,
  initialTab,
}: {
  initialOrders: BoardOrder[];
  initialRestaurant: Restaurant;
  initialTab?: ColKey;
}) {
  const rid = initialRestaurant.id;
  const [orders, setOrders] = useState(initialOrders);
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [tab, setTab] = useState<ColKey>(initialTab ?? "new");
  const [selected, setSelected] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineBusy, setDeclineBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [acked, setAcked] = useState<Set<string>>(() => new Set());
  const [soundWanted, setSoundWanted] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [chimes, setChimes] = useState(0);
  const known = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const ackKey = `apporte_acked_${rid}`;

  // Restore acknowledgements + sound preference
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ackKey) || "[]");
      if (Array.isArray(saved)) setAcked(new Set(saved.slice(-300)));
      setSoundWanted(localStorage.getItem("apporte_sound") === "1");
    } catch {}
  }, [ackKey]);

  // Re-arm audio on the first tap when the preference is on (browsers require a gesture)
  useEffect(() => {
    if (!soundWanted || soundReady) return;
    const arm = async () => setSoundReady(await unlockAudio());
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [soundWanted, soundReady]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const ack = useCallback(
    (id: string) => {
      setAcked((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(ackKey, JSON.stringify(Array.from(next).slice(-300)));
        } catch {}
        return next;
      });
    },
    [ackKey],
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/merchant/board", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { orders: BoardOrder[]; restaurant: Restaurant };
      const fresh = data.orders.filter((o) => o.status === "placed" && !known.current.has(o.id));
      data.orders.forEach((o) => known.current.add(o.id));
      setOrders(data.orders);
      if (data.restaurant) setRestaurant(data.restaurant);
      setNow(Date.now());
      for (const o of fresh) {
        toast(`Nouvelle commande #${shortId(o.id)} · ${formatPriceUSD(o.totalUsd)}`, { icon: "🔔", id: `new-${o.id}` });
      }
    } catch {}
  }, []);

  const { connected } = useLive([`restaurant:${rid}`], () => void refresh(), { pollMs: 12_000, fastPollMs: 3_000 });

  const byCol = useMemo(() => {
    const m = {} as Record<ColKey, BoardOrder[]>;
    for (const c of COLS) m[c.key] = orders.filter((o) => c.statuses.includes(o.status));
    m.new.sort((a, b) => a.createdAt - b.createdAt); // oldest first: serve in order
    m.kitchen.sort((a, b) => a.createdAt - b.createdAt);
    m.ready.sort((a, b) => a.updatedAt - b.updatedAt);
    m.history = m.history.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);
    return m;
  }, [orders]);

  const unread = byCol.new.filter((o) => !acked.has(o.id));
  const unreadCount = unread.length;

  // Chime repeats until every new order is acknowledged
  useEffect(() => {
    if (!unreadCount || !soundWanted || !soundReady) return;
    const ring = () => {
      if (playChime()) setChimes((c) => c + 1);
    };
    ring();
    const t = setInterval(ring, CHIME_EVERY_MS);
    return () => clearInterval(t);
  }, [unreadCount, soundWanted, soundReady]);

  // Unread badge in the tab title and on the installed app icon
  useEffect(() => {
    const base = "Commandes du restaurant · Apporte";
    document.title = unreadCount ? `(${unreadCount}) Nouvelle commande · Apporte` : base;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (unreadCount) nav.setAppBadge?.(unreadCount)?.catch(() => {});
      else nav.clearAppBadge?.()?.catch(() => {});
    } catch {}
    return () => {
      document.title = base;
    };
  }, [unreadCount]);

  async function enableSound() {
    const ok = await unlockAudio();
    setSoundReady(ok);
    setSoundWanted(true);
    try {
      localStorage.setItem("apporte_sound", "1");
    } catch {}
    if (ok) {
      playChime();
      toast.success("Son activé : la sonnerie retentit jusqu’à ce que la commande soit vue.");
    } else toast.error("Ce navigateur bloque le son.");
  }
  function disableSound() {
    setSoundWanted(false);
    try {
      localStorage.setItem("apporte_sound", "0");
    } catch {}
  }

  async function act(orderId: string, body: Record<string, unknown>, success: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          data.error === "paid_order" || data.reason === "paid_order"
            ? "Commande déjà payée : on ne peut pas la refuser."
            : data.error === "invalid_state" || data.reason === "invalid_state"
            ? "La commande a déjà changé d’étape."
            : res.status === 401
              ? "Session expirée. Reconnecte-toi."
              : "Action impossible. Réessaie.",
        );
      } else {
        const names = Array.isArray(data.unavailable) ? data.unavailable.filter((n: unknown) => typeof n === "string" && n) : [];
        toast.success(
          names.length
            ? `${success} ${names.join(", ")} ${names.length > 1 ? "ne sont plus proposés" : "n’est plus proposé"}.`
            : success,
        );
      }
    } catch {
      toast.error("Connexion perdue. Réessaie.");
    }
    await refresh();
  }

  async function toggleOpen(v: boolean) {
    const prev = restaurant;
    setRestaurant({ ...restaurant, acceptingOrders: v });
    const res = await fetch("/api/merchant/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptingOrders: v }),
    }).catch(() => null);
    if (!res?.ok) {
      setRestaurant(prev);
      toast.error("Impossible de changer l’état. Réessaie.");
      return;
    }
    const data = await res.json();
    setRestaurant(data.restaurant);
    toast.success(v ? "Restaurant ouvert aux commandes" : "Commandes en pause");
  }

  async function confirmDecline(reason: string) {
    if (!declineId || declineBusy) return;
    setDeclineBusy(true);
    await act(declineId, { action: "merchant_reject", reason }, "Commande refusée. Le client est prévenu.");
    setDeclineBusy(false);
    setDeclineId(null);
    setSelected((cur) => (cur === declineId ? null : cur));
  }

  const sel = orders.find((o) => o.id === selected) || null;
  useEffect(() => {
    if (sel) ack(sel.id);
  }, [sel, ack]);

  const av = restaurant.availability;
  const outsideHours = av?.reason === "outside_hours";

  return (
    <div className="py-2" data-testid="kitchen-board" data-chimes={chimes} data-unread={unreadCount}>
      {/* Header */}
      <div className="relative mb-4 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <SafeImage src={restaurant.imageUrl} alt={restaurant.name} width={160} height={160} className="h-14 w-14 shrink-0 rounded-2xl object-cover sm:h-16 sm:w-16" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{restaurant.name}</h1>
                <LiveBadge connected={connected} />
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600" data-testid="open-state">
                <span className={cn("h-2 w-2 rounded-full", av?.open ? "bg-emerald-500" : outsideHours ? "bg-gray-400" : "bg-amber-500")} />
                {av?.open ? "Ouvert : les clients peuvent commander" : outsideHours ? `Fermé (horaires)${av?.detail ? ` · ${av.detail}` : ""}` : "En pause : les clients ne peuvent pas commander"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-10 items-center gap-2.5 rounded-full border border-gray-200 bg-gray-50 pl-4 pr-1.5 text-sm font-medium">
              {restaurant.acceptingOrders !== false ? "Ouvert" : "En pause"}
              <Switch checked={restaurant.acceptingOrders !== false} onChange={toggleOpen} label="Accepter les commandes" testId="open-switch" />
            </label>
            {soundWanted && soundReady ? (
              <button type="button" onClick={disableSound} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 text-sm font-medium text-emerald-800" data-testid="sound-toggle">
                <Volume2 className="h-4 w-4" aria-hidden /> Son activé
              </button>
            ) : (
              <button type="button" onClick={enableSound} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-900 px-3.5 text-sm font-semibold text-white hover:bg-gray-800" data-testid="sound-toggle" style={{ color: "#fff" }}>
                <VolumeX className="h-4 w-4" aria-hidden /> {soundWanted ? "Touchez pour réactiver le son" : "Activer le son"}
              </button>
            )}
            <Link href="/merchant/menu" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50" style={{ color: "#1f2937" }}>
              <Utensils className="h-4 w-4" aria-hidden /> Menu
            </Link>
            <Link href="/merchant/horaires" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50" style={{ color: "#1f2937" }}>
              <CalendarClock className="h-4 w-4" aria-hidden /> Horaires
            </Link>
            <Link href="/merchant/stats" className="hidden h-10 items-center gap-1.5 rounded-full border border-gray-200 px-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 sm:inline-flex" style={{ color: "#1f2937" }}>
              <BarChart3 className="h-4 w-4" aria-hidden /> Stats
            </Link>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setTab("new");
              setSelected(unread[0].id);
            }}
            className="flex w-full items-center justify-center gap-2 bg-amber-400 px-4 py-2.5 text-sm font-bold text-gray-900 animate-pulse motion-reduce:animate-none"
            data-testid="unread-banner"
          >
            <BellRing className="h-4 w-4" aria-hidden />
            {unreadCount === 1 ? "1 nouvelle commande à voir" : `${unreadCount} nouvelles commandes à voir`}
          </button>
        )}
      </div>

      <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-snug text-amber-950" data-testid="stock-hint">
        Rupture de stock : marque le plat indisponible dans le menu avant les commandes, pour ne pas encaisser un client. Une commande déjà payée ne peut pas être refusée.
      </p>

      {/* Phone tabs */}
      <nav aria-label="Colonnes" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        {COLS.map((c) => {
          const active = tab === c.key;
          const count = byCol[c.key].length;
          const badge = c.key === "new" ? unreadCount : 0;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setTab(c.key)}
              aria-pressed={active}
              data-tab={c.key}
              className={cn(
                "relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap",
                active ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-200 bg-white text-gray-700",
              )}
            >
              {c.short}
              {c.key !== "history" && (
                <span className={cn("min-w-5 rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : count ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-500")}>{count}</span>
              )}
              {badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white" data-testid="unread-badge">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Columns (tablet / desktop) + single column on phone */}
      <div className="grid gap-4 md:grid-cols-3">
        {COLS.slice(0, 3).map((c) => (
          <section
            key={c.key}
            aria-label={c.label}
            data-column={c.key}
            className={cn("rounded-3xl bg-gray-50/80 p-3 md:block md:min-h-[420px] md:border md:border-gray-200", tab === c.key ? "block" : "hidden")}
          >
            <header className="mb-3 hidden items-center justify-between px-1 md:flex">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
                <c.icon className="h-4 w-4 text-emerald-700" aria-hidden /> {c.label}
              </h2>
              <div className="flex items-center gap-1.5">
                {c.key === "new" && unreadCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white" data-testid="unread-badge">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</span>
                )}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700 shadow-sm">{byCol[c.key].length}</span>
              </div>
            </header>
            {byCol[c.key].length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                <c.icon className="h-8 w-8 text-gray-300" aria-hidden />
                <p className="mt-2 text-sm text-gray-500">{c.empty}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {byCol[c.key].map((o) => (
                  <OrderCard key={o.id} o={o} now={now} unread={c.key === "new" && !acked.has(o.id)} onOpen={() => setSelected(o.id)} onDecline={() => setDeclineId(o.id)} onAct={act} />
                ))}
              </div>
            )}
          </section>
        ))}
        {/* History: tab on phone, full-width strip below on tablet/desktop */}
        <section aria-label="Historique" data-column="history" className={cn("rounded-3xl p-1 md:col-span-3 md:block md:p-0", tab === "history" ? "block" : "hidden")}>
          <h2 className="mb-2 hidden text-sm font-bold uppercase tracking-wide text-gray-700 md:block">Terminées récemment</h2>
          {byCol.history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-6 text-center text-sm text-gray-500">Aucune commande terminée.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {byCol.history.map((o) => (
                <button key={o.id} type="button" onClick={() => setSelected(o.id)} data-order-id={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-gray-300">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">#{shortId(o.id)} · {formatPriceUSD(o.totalUsd)}</div>
                    <div className="truncate text-xs text-gray-500">{timeFr(o.updatedAt)} · {o.status === "cancelled" && o.cancelReason ? o.cancelReason : o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", o.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700")}>{statusLabelFr(o.status)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <OrderDetail order={sel} now={now} onClose={() => setSelected(null)} onDecline={() => sel && setDeclineId(sel.id)} onAct={act} />
      <DeclineDialog open={!!declineId} busy={declineBusy} onClose={() => !declineBusy && setDeclineId(null)} onConfirm={(reason) => void confirmDecline(reason)} />
    </div>
  );
}

function OrderCard({
  o,
  now,
  unread,
  onOpen,
  onDecline,
  onAct,
}: {
  o: BoardOrder;
  now: number;
  unread: boolean;
  onOpen: () => void;
  onDecline: () => void;
  onAct: (id: string, body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const count = o.items.reduce((s, i) => s + i.quantity, 0);
  const due = o.acceptedAt && o.prepMinutes ? o.acceptedAt + o.prepMinutes * 60000 : undefined;
  const late = due ? now > due : false;
  const run = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    await onAct(o.id, body, msg);
    setBusy(false);
  };
  return (
    <article
      data-order-id={o.id}
      data-status={o.status}
      className={cn(
        "group rounded-2xl border bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md",
        unread ? "border-amber-400 ring-2 ring-amber-300" : "border-gray-200",
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left" data-testid="open-order">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">#{shortId(o.id)}</span>
              {unread && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-gray-900">Nouveau</span>}
            </div>
            <div className="text-xs text-gray-500">{timeFr(o.createdAt)} · {ago(o.createdAt, now)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold tabular-nums">{formatPriceUSD(o.subtotalUsd)}</div>
            <div className="text-[11px] text-gray-500">{count} article{count > 1 ? "s" : ""}</div>
          </div>
        </div>
        <ul className="mt-2 space-y-0.5 text-sm">
          {o.items.slice(0, 3).map((i) => (
            <li key={i.id} className="flex gap-2">
              <span className="w-7 shrink-0 font-semibold tabular-nums text-emerald-800">{i.quantity}×</span>
              <span className="truncate">{i.name}</span>
            </li>
          ))}
          {o.items.length > 3 && <li className="pl-9 text-xs text-gray-500">+ {o.items.length - 3} autre(s)</li>}
        </ul>
        {o.status === "preparing" || o.status === "restaurant_accepted" ? (
          due ? (
            <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", late ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800")}>
              <Clock className="h-3 w-3" aria-hidden /> {late ? "En retard" : `Prête vers ${timeFr(due)}`}
            </div>
          ) : null
        ) : null}
        {["rider_searching", "rider_assigned", "going_to_restaurant", "arrived"].includes(o.status) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
            <Bike className="h-3.5 w-3.5" aria-hidden />
            {o.riderName ? <span><span className="font-medium text-gray-900">{o.riderName}</span> · {statusLabelFr(o.status).toLowerCase()}</span> : "Recherche d’un livreur…"}
          </div>
        )}
      </button>
      {o.status === "placed" && (
        <div className="mt-3 grid gap-2">
          <Button size="sm" className="w-full" disabled={busy} data-action="merchant_accept" onClick={() => run({ action: "merchant_accept_prep", prepMinutes: 15 }, "Commande acceptée (15 min)")}>Accepter · 15 min</Button>
          <div className={cn("grid gap-2", o.paymentStatus !== "paid" && "grid-cols-2")}>
            {o.paymentStatus !== "paid" && (
              <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" data-testid="open-decline" data-action="open-reject" onClick={onDecline}>Refuser</Button>
            )}
            <Button size="sm" variant="outline" onClick={onOpen}>Détails</Button>
          </div>
          {o.paymentStatus === "paid" && (
            <p className="text-xs text-amber-800" data-testid="paid-no-refuse">Déjà payée : refus impossible.</p>
          )}
        </div>
      )}
      {o.status === "restaurant_accepted" && (
        <Button size="sm" className="mt-3 w-full" disabled={busy} data-action="merchant_preparing" onClick={() => run({ action: "merchant_preparing" }, "Préparation lancée")}>Lancer la préparation</Button>
      )}
      {o.status === "preparing" && (
        <Button size="sm" className="mt-3 w-full" disabled={busy} data-action="merchant_ready" onClick={() => run({ action: "merchant_ready" }, "Prête : on cherche un livreur")}>Prête : appeler un livreur</Button>
      )}
    </article>
  );
}

function OrderDetail({
  order,
  now,
  onClose,
  onDecline,
  onAct,
}: {
  order: BoardOrder | null;
  now: number;
  onClose: () => void;
  onDecline: () => void;
  onAct: (id: string, body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [prep, setPrep] = useState(15);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPrep(15);
  }, [order?.id]);
  if (!order) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const o = order;
  const run = async (body: Record<string, unknown>, msg: string, close = false) => {
    setBusy(true);
    await onAct(o.id, body, msg);
    setBusy(false);
    if (close) onClose();
  };
  const payout = o.commissionUsd != null ? o.subtotalUsd - o.commissionUsd : undefined;
  const footer =
    o.status === "placed" ? (
        <div className="space-y-3 pb-1">
          <div>
            <p className="mb-2 text-sm font-semibold">Temps de préparation</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Temps de préparation">
              {PREP_CHOICES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={prep === m} onClick={() => setPrep(m)} data-prep={m} className={cn("h-10 min-w-14 rounded-full border px-3 text-sm font-medium tabular-nums", prep === m ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-200 bg-white")}>{m} min</button>
              ))}
            </div>
          </div>
          {o.paymentStatus === "paid" ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-900" data-testid="paid-no-refuse">Cette commande est déjà payée. On ne peut pas la refuser.</p>
              <Button disabled={busy} data-action="detail-accept" onClick={() => run({ action: "merchant_accept_prep", prepMinutes: prep }, `Commande acceptée (${prep} min)`)}>Accepter · {prep} min</Button>
            </div>
          ) : (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={onDecline} data-action="open-reject" data-testid="open-decline">Refuser</Button>
              <Button disabled={busy} data-action="detail-accept" onClick={() => run({ action: "merchant_accept_prep", prepMinutes: prep }, `Commande acceptée (${prep} min)`)}>Accepter · {prep} min</Button>
            </div>
          )}
        </div>
    ) : o.status === "restaurant_accepted" ? (
      <Button className="mb-1 w-full" disabled={busy} onClick={() => run({ action: "merchant_preparing" }, "Préparation lancée")}>Lancer la préparation</Button>
    ) : o.status === "preparing" ? (
      <Button className="mb-1 w-full" disabled={busy} onClick={() => run({ action: "merchant_ready" }, "Prête : on cherche un livreur", true)}>Prête : appeler un livreur</Button>
    ) : undefined;

  return (
    <Sheet
      open
      onClose={onClose}
      testId="order-detail"
      title={`Commande #${shortId(o.id)}`}
      subtitle={<span>{statusLabelFr(o.status)} · reçue à {timeFr(o.createdAt)} ({ago(o.createdAt, now)})</span>}
      footer={footer}
    >
      <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
        {o.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 p-3">
            <SafeImage src={i.imageUrl} alt={i.name} width={96} height={96} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{i.name}</div>
              <div className="text-xs text-gray-500">{formatPriceUSD(i.unitPriceUsd)} l’unité</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums text-emerald-800">× {i.quantity}</div>
              <div className="text-xs tabular-nums text-gray-600">{formatPriceUSD(i.unitPriceUsd * i.quantity)}</div>
            </div>
          </li>
        ))}
      </ul>
      {o.addressNotes && (
        <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          <div className="text-xs font-semibold uppercase tracking-wide">Note du client</div>
          {o.addressNotes}
        </div>
      )}
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-gray-600">Plats</dt><dd className="tabular-nums">{formatPriceUSD(o.subtotalUsd)}</dd></div>
        {o.commissionUsd != null && (
          <div className="flex justify-between"><dt className="text-gray-600">Commission Apporte</dt><dd className="tabular-nums">− {formatPriceUSD(o.commissionUsd)}</dd></div>
        )}
        {payout != null && (
          <div className="flex justify-between border-t border-gray-100 pt-1.5 font-semibold"><dt>Vous recevez</dt><dd className="tabular-nums">{formatPriceUSD(payout)}</dd></div>
        )}
      </dl>
      {o.prepMinutes && o.acceptedAt && (
        <p className="mt-3 text-sm text-gray-600">Acceptée à {timeFr(o.acceptedAt)} · prête prévue à {timeFr(o.acceptedAt + o.prepMinutes * 60000)}</p>
      )}
      {o.riderName && <p className="mt-2 text-sm text-gray-600">Livreur : <span className="font-medium text-gray-900">{o.riderName}</span></p>}
      {o.status === "cancelled" && (
        <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800">Annulée{o.cancelReason ? ` : ${o.cancelReason}` : ""}</p>
      )}
    </Sheet>
  );
}
