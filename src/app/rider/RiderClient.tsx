"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Bike, CheckCircle2, MapPin, Package, Phone, Store, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { SafeImage } from "@/src/components/SafeImage";
import { cn, formatPriceUSD, paymentLabelFr } from "@/src/lib/utils";
import { formatDrcPhone } from "@/src/lib/phone";
import type { RiderStatus } from "@/src/lib/types";
import type { RiderActiveJob, RiderState } from "@/src/lib/data/db";

type Offer = {
  orderId: string;
  pickupDistanceKm: number;
  deliveryDistanceKm: number;
  etaMinutes: number;
  earningsUsd: number;
  expiresAt: number;
  deliveryAddress?: string;
  deliveryZone?: string;
  firstItemName?: string;
  firstItemImageUrl?: string;
  pickupName?: string;
  pickupZone?: string;
} | null;

const STEPS: { status: RiderActiveJob["status"]; action: string; cta: string; label: string }[] = [
  { status: "rider_assigned", action: "going", cta: "Je pars vers le restaurant", label: "Course acceptée" },
  { status: "going_to_restaurant", action: "arrived", cta: "Je suis arrivé au restaurant", label: "En route vers le restaurant" },
  { status: "arrived", action: "picked_up", cta: "Commande récupérée", label: "Au restaurant" },
  { status: "picked_up", action: "delivering", cta: "Je pars livrer le client", label: "Commande récupérée" },
  { status: "delivering", action: "delivered", cta: "Confirmer la livraison", label: "En livraison" },
];

const ERRORS: Record<string, string> = {
  offer_gone: "Cette course n’est plus disponible.",
  invalid_state: "La course a déjà avancé. Mise à jour…",
  bad_pin_format: "Le PIN contient 4 chiffres.",
  forbidden: "Cette course ne t’est pas attribuée.",
  active_delivery: "Termine d’abord ta course en cours.",
};

export function RiderClient({ initial }: { initial: RiderState }) {
  const [status, setStatus] = useState<RiderStatus>(initial.status);
  const [job, setJob] = useState<RiderActiveJob | null>(initial.activeOrder);
  const [earnings, setEarnings] = useState(initial.earningsTodayUsd);
  const [offer, setOffer] = useState<Offer>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const riderId = initial.riderId;
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/rider/me", { cache: "no-store" });
      if (!r.ok) return;
      const s: RiderState = await r.json();
      setStatus(s.status);
      setJob(s.activeOrder);
      setEarnings(s.earningsTodayUsd);
      if (s.activeOrder) setOffer(null);
    } catch {}
  }, []);

  // Restore from the server whenever the app comes back (reload, lock screen, tab switch)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("online", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("online", onVis);
    };
  }, [refresh]);

  // Poll for offers only while online, free and visible
  useEffect(() => {
    if (status !== "online" || job) return;
    let stop = false;
    async function poll() {
      if (stop || document.visibilityState !== "visible" || inFlight.current) return;
      inFlight.current = true;
      try {
        const r = await fetch("/api/dispatch/offer", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (!stop) setOffer(data.offer ?? null);
      } catch {
      } finally {
        inFlight.current = false;
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [status, job]);

  useEffect(() => {
    if (!offer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [offer]);

  async function changeStatus(next: "online" | "offline") {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    if (next === "offline") setOffer(null);
    const r = await fetch(`/api/riders/${riderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    if (!r || !r.ok) {
      setStatus(prev);
      const d = r ? await r.json().catch(() => ({})) : {};
      toast.error(ERRORS[d.reason] || "Statut non enregistré. Vérifie ta connexion.");
      if (d.reason === "active_delivery") refresh();
      return;
    }
    toast.success(next === "online" ? "Tu es en ligne." : "Tu es hors ligne.");
  }

  async function post(action: string, orderId: string, extra?: Record<string, string>) {
    const r = await fetch("/api/dispatch/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, orderId, ...extra }),
    }).catch(() => null);
    const data = r ? await r.json().catch(() => ({})) : { reason: "network" };
    return { ok: !!r && r.ok && data.ok !== false, data };
  }

  async function respondToOffer(action: "accept" | "decline") {
    if (!offer || busy) return;
    setBusy(true);
    try {
      const { ok, data } = await post(action, offer.orderId);
      setOffer(null);
      if (!ok) {
        toast.error(ERRORS[data.reason] || "Action non prise en compte. Réessaie.");
        return;
      }
      if (action === "accept") {
        toast.success("Course acceptée. Direction le restaurant !");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function nextStep() {
    if (!job || busy) return;
    const step = STEPS.find((s) => s.status === job.status);
    if (!step) return;
    if (step.action === "delivered" && !/^\d{4}$/.test(pin)) {
      toast.error("Saisis le PIN à 4 chiffres donné par le client.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await post(step.action, job.id, step.action === "delivered" ? { pin } : undefined);
      if (step.action === "delivered") {
        if (data.delivered?.ok) {
          toast.success(`Livraison confirmée · +${formatPriceUSD(job.earningsUsd)}`);
          setPin("");
          await refresh();
        } else if (data.delivered?.reason === "bad_pin") {
          toast.error("PIN incorrect. Demande-le à nouveau au client.");
        } else {
          toast.error(ERRORS[data.reason] || "Impossible de terminer la course.");
          await refresh();
        }
        return;
      }
      if (!ok) {
        toast.error(ERRORS[data.reason] || "Action non prise en compte. Réessaie.");
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = job ? STEPS.findIndex((s) => s.status === job.status) : -1;
  const step = stepIndex >= 0 ? STEPS[stepIndex] : null;
  const secondsLeft = offer ? Math.max(0, Math.round((offer.expiresAt - now) / 1000)) : 0;
  const showOffer = !!offer && status === "online" && !job;

  return (
    <div className="py-2" style={showOffer ? { paddingBottom: "max(112px, calc(80px + 64px + env(safe-area-inset-bottom)))" } : undefined}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Livreur</h1>
          <p className="text-sm text-gray-600">{initial.name}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800" title="Gains du jour">
          <Wallet className="h-4 w-4" aria-hidden />
          {formatPriceUSD(earnings)} aujourd’hui
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3 pb-3 md:pb-3">
          <div className="font-medium">Statut</div>
          <StatusPill status={status} />
        </CardHeader>
        <CardContent className="grid gap-2">
          <div
            role="radiogroup"
            aria-label="Disponibilité"
            className={cn("grid grid-cols-2 rounded-full bg-gray-100 p-1", status === "busy" && "opacity-60")}
          >
            {(["online", "offline"] as const).map((s) => {
              const active = status === s || (s === "online" && status === "busy");
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={status === "busy"}
                  onClick={() => changeStatus(s)}
                  className={cn(
                    "h-10 rounded-full text-sm font-semibold transition-colors",
                    active ? (s === "online" ? "bg-emerald-700 text-white shadow" : "bg-white text-gray-900 shadow") : "text-gray-600",
                  )}
                >
                  {s === "online" ? "En ligne" : "Hors ligne"}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-600">
            {status === "busy"
              ? "Course en cours : tu repasses en ligne automatiquement après la livraison."
              : status === "online"
                ? "Tu reçois les nouvelles courses de Gombe."
                : "Tu ne reçois aucune course."}
          </p>
        </CardContent>
      </Card>

      {status === "online" && !job && !offer && (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/empty-rider.png" alt="" className="mx-auto h-24 w-24 object-contain" />
          <div className="mt-3 font-semibold">En attente d’une course</div>
          <p className="mt-1 text-sm text-gray-600">Garde l’application ouverte : les offres arrivent ici.</p>
        </div>
      )}

      {showOffer && offer && (
        <Card className="mt-4 ring-2 ring-emerald-600/30">
          <CardHeader className="flex items-center justify-between pb-3 md:pb-3">
            <div className="font-semibold">Nouvelle course</div>
            <div className={cn("rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", secondsLeft <= 10 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>
              Expire dans {secondsLeft} s
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {offer.firstItemImageUrl && (
              <SafeImage src={offer.firstItemImageUrl} alt={offer.firstItemName || "Article"} width={640} height={240} className="h-28 w-full rounded-xl object-cover" />
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoRow icon={Store} title="Retrait" value={offer.pickupName || "—"} sub={`${offer.pickupDistanceKm} km`} />
              <InfoRow icon={MapPin} title="Livraison" value={offer.deliveryAddress || "—"} sub={`${offer.deliveryZone || "Gombe"} · ${offer.deliveryDistanceKm} km`} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {offer.firstItemName && <span className="rounded-full bg-gray-100 px-2.5 py-1">{offer.firstItemName}</span>}
              <span className="rounded-full bg-gray-100 px-2.5 py-1">≈ {offer.etaMinutes} min</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">Gain {formatPriceUSD(offer.earningsUsd)}</span>
            </div>
          </CardContent>
        </Card>
      )}
      {showOffer && (
        <div className="fixed left-0 right-0 z-50" style={{ bottom: "max(16px, calc(64px + env(safe-area-inset-bottom)))" }}>
          <div className="mx-auto max-w-5xl px-4 md:mb-4">
            <div className="grid grid-cols-3 gap-2 rounded-full bg-white/80 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur">
              <Button className="col-span-2 rounded-full" onClick={() => respondToOffer("accept")} disabled={busy}>
                Accepter la course
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => respondToOffer("decline")} disabled={busy}>
                Refuser
              </Button>
            </div>
          </div>
        </div>
      )}

      {job && step && (
        <Card className="mt-4" data-testid="active-job">
          <CardHeader className="pb-3 md:pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">Course en cours #{job.id.slice(-6)}</div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{step.label}</span>
            </div>
            <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="Étapes de la course">
              {STEPS.map((s, i) => (
                <li key={s.status} className={cn("h-1.5 rounded-full", i <= stepIndex ? "bg-emerald-600" : "bg-gray-200")} />
              ))}
            </ol>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoRow icon={Store} title="Retrait" value={job.pickupName} sub={job.pickupZone} />
              <InfoRow icon={MapPin} title="Client" value={job.address} sub={job.addressNotes ? `Repère : ${job.addressNotes}` : job.zone} />
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="mb-1.5 flex items-center gap-2 font-medium"><Package className="h-4 w-4 text-emerald-700" aria-hidden /> À récupérer</div>
              <ul className="grid gap-1 text-gray-700">
                {job.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3"><span className="truncate">{it.name}</span><span className="tabular-nums">× {it.quantity}</span></li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {job.paymentMethod === "Cash on delivery" && (
                <div className="text-sm">
                  À encaisser : <span className="font-bold text-emerald-800">{formatPriceUSD(job.totalUsd)}</span>
                  <span className="text-gray-500"> ({paymentLabelFr(job.paymentMethod)})</span>
                </div>
              )}
              {job.customerPhone && (
                <a href={`tel:${job.customerPhone}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  <Phone className="h-4 w-4" aria-hidden /> Appeler {formatDrcPhone(job.customerPhone)}
                </a>
              )}
            </div>
            {step.action === "delivered" && (
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">PIN de livraison (donné par le client)</span>
                <input
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-center font-mono text-2xl tracking-[0.5em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:w-48"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="••••"
                  aria-label="PIN client"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => { if (e.key === "Enter") nextStep(); }}
                />
              </label>
            )}
            <Button size="lg" className="w-full gap-2 rounded-xl" onClick={nextStep} disabled={busy}>
              {step.action === "delivered" ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <Bike className="h-5 w-5" aria-hidden />}
              {busy ? "Un instant…" : step.cta}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: RiderStatus }) {
  const map = {
    online: { label: "En ligne", cls: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
    offline: { label: "Hors ligne", cls: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
    busy: { label: "Occupé", cls: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  }[status];
  return (
    <span data-testid="rider-status" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", map.cls)}>
      <span className={cn("h-2 w-2 rounded-full", map.dot)} aria-hidden />
      {map.label}
    </span>
  );
}

function InfoRow({ icon: Icon, title, value, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-gray-100 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
        <div className="font-medium break-words">{value}</div>
        {sub && <div className="text-xs text-gray-600 break-words">{sub}</div>}
      </div>
    </div>
  );
}
