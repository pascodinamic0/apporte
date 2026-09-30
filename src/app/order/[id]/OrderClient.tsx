"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { Ban, Bike, CheckCircle2, ChefHat, Clock, KeyRound, MapPin, Phone, Receipt, Store } from "lucide-react";
import { cn, formatPriceUSD, paymentLabelFr } from "@/src/lib/utils";
import { formatDrcPhone } from "@/src/lib/phone";
import { SafeImage } from "@/src/components/SafeImage";
import { LiveBadge } from "@/src/components/LiveBadge";
import { ReorderButton } from "@/src/components/ReorderButton";
import { confirmDialog } from "@/src/components/ConfirmDialog";
import { useLive } from "@/src/lib/client/live";
import { RateOrder } from "./parts";

const MapPicker = dynamic(() => import("@/src/components/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse bg-gray-100" />,
});

const steps = ["placed", "restaurant_accepted", "preparing", "rider_searching", "rider_assigned", "going_to_restaurant", "arrived", "picked_up", "delivering", "delivered"] as const;

function labelForStatus(s: string, isSmart: boolean) {
  switch (s) {
    case "placed": return "Commande passée";
    case "restaurant_accepted": return isSmart ? "Commande validée" : "Restaurant a accepté";
    case "preparing": return isSmart ? "Préparation en cours" : "En préparation";
    case "rider_searching": return "Recherche d’un livreur";
    case "rider_assigned": return "Livreur assigné";
    case "going_to_restaurant": return isSmart ? "En route vers le dépôt" : "En route vers le restaurant";
    case "arrived": return isSmart ? "Arrivé au dépôt" : "Livreur arrivé";
    case "picked_up": return "Commande récupérée";
    case "delivering": return "En livraison";
    case "delivered": return "Livré";
    case "cancelled": return "Annulée";
  }
  return s;
}

function hero(status: string, isSmart: boolean, prepMinutes?: number) {
  switch (status) {
    case "placed": return { icon: Clock, title: isSmart ? "Commande reçue" : "En attente du restaurant", text: "Le restaurant va confirmer ta commande. Tu peux encore l’annuler." };
    case "restaurant_accepted": return { icon: ChefHat, title: "Commande acceptée", text: prepMinutes ? `Prête dans environ ${prepMinutes} min.` : "La cuisine s’y met." };
    case "preparing": return { icon: ChefHat, title: "En préparation", text: prepMinutes ? `Environ ${prepMinutes} min de préparation.` : "Ta commande se prépare." };
    case "rider_searching": return { icon: Bike, title: "On cherche un livreur", text: "Un livreur proche va accepter la course." };
    case "rider_assigned":
    case "going_to_restaurant": return { icon: Bike, title: "Un livreur arrive", text: isSmart ? "Il passe au dépôt récupérer ta commande." : "Il va chercher ta commande au restaurant." };
    case "arrived": return { icon: Store, title: "Livreur sur place", text: "Il récupère ta commande." };
    case "picked_up":
    case "delivering": return { icon: Bike, title: "En route vers toi", text: "Prépare ton code PIN et le paiement." };
    case "delivered": return { icon: CheckCircle2, title: "Livré", text: "Bon appétit !" };
    case "cancelled": return { icon: Ban, title: "Commande annulée", text: "" };
  }
  return { icon: Clock, title: status, text: "" };
}

export function OrderClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<null | "unauthorized" | "forbidden" | "not_found">(null);
  const [cancelling, setCancelling] = useState(false);
  const lastStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) setError("unauthorized");
      else if (r.status === 403) setError("forbidden");
      else if (r.status === 404) setError("not_found");
      else if (data.order) {
        setError(null);
        setOrder(data.order);
        if (lastStatus.current && lastStatus.current !== data.order.status && typeof navigator !== "undefined") {
          navigator.vibrate?.(80);
        }
        lastStatus.current = data.order.status;
      }
    } catch {}
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);
  const done = order && (order.status === "delivered" || order.status === "cancelled");
  const { connected } = useLive([`order:${orderId}`], () => void load(), { pollMs: 20_000, fastPollMs: 5_000, enabled: !done });

  async function cancel() {
    const ok = await confirmDialog({
      title: "Annuler la commande ?",
      message: "Le restaurant n’a pas encore accepté. Rien ne te sera facturé.",
      confirmLabel: "Annuler la commande",
      cancelLabel: "Garder",
      tone: "danger",
    });
    if (!ok) return;
    setCancelling(true);
    try {
      const r = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "customer_cancel" }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) toast.success("Commande annulée");
      else toast.error(data.reason === "already_accepted" ? "Trop tard : le restaurant a déjà accepté ta commande." : "Annulation impossible. Réessaie.");
    } finally {
      setCancelling(false);
      load();
    }
  }

  if (error && !order) {
    const msg = {
      unauthorized: ["Connecte-toi pour suivre cette commande", "Le suivi est réservé au client, au restaurant, au livreur et à l’équipe Apporte."],
      forbidden: ["Cette commande n’est pas liée à ton compte", "Vérifie que tu es connecté avec le bon compte."],
      not_found: ["Commande introuvable", "Ce lien n’existe pas ou plus."],
    }[error];
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="text-xl font-bold">{msg[0]}</h1>
        <p className="mt-1 text-sm text-gray-600">{msg[1]}</p>
        <div className="mt-4 flex justify-center gap-3 text-sm font-medium">
          <Link href="/demo">Changer de compte</Link>
          <Link href="/">Accueil</Link>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div aria-busy="true" aria-label="Chargement de la commande">
        <div className="h-36 rounded-3xl bg-gray-100" />
        <div className="mt-3 h-6 w-48 rounded bg-gray-100" />
        <div className="mt-3 h-64 rounded-3xl bg-gray-50" />
      </div>
    );
  }
  const isSmart = !order.restaurantId;
  const activeSteps = isSmart ? steps.filter((s) => s !== "restaurant_accepted" && s !== "preparing") : steps;
  const idx = activeSteps.indexOf(order.status);
  const h = hero(order.status, isSmart, order.prepMinutes);
  const cancelled = order.status === "cancelled";
  const canCancel = order.pin && (order.status === "placed" || (isSmart && order.status === "rider_searching" && !order.riderId));
  const isOwner = !!order.pin;
  const hasPin = order.deliveryLat != null && order.deliveryLng != null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" data-testid="order-tracking" data-status={order.status}>
      <div className="grid min-w-0 gap-4">
        <section className={cn("overflow-hidden rounded-3xl border shadow-sm", cancelled ? "border-red-200 bg-red-50" : "border-emerald-100 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white")}>
          <div className="flex items-start justify-between gap-3 p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", cancelled ? "bg-red-100 text-red-700" : "bg-white/15")}>
                <h.icon className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className={cn("text-xs font-semibold uppercase tracking-wide", cancelled ? "text-red-700" : "text-emerald-100")}>Commande #{order.id.slice(-6).toUpperCase()}</div>
                <h1 className={cn("text-2xl font-extrabold tracking-tight", cancelled && "text-red-900")} data-testid="order-status-title">{h.title}</h1>
                {cancelled ? (
                  <p className="mt-0.5 text-sm text-red-800">{order.cancelReason ? `Motif : ${order.cancelReason}` : "Cette commande a été annulée."}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-emerald-50">{h.text}</p>
                )}
              </div>
            </div>
            {!done && <LiveBadge connected={connected} className="shrink-0" />}
          </div>
          {!cancelled && order.status !== "delivered" && isOwner && order.pin && (
            <div className="flex items-center justify-between gap-3 border-t border-white/15 bg-black/10 px-5 py-3">
              <span className="flex items-center gap-2 text-sm text-emerald-50"><KeyRound className="h-4 w-4" aria-hidden /> Code PIN à donner au livreur</span>
              <span className="rounded-lg bg-white px-3 py-1 font-mono text-lg font-bold tracking-widest text-emerald-800" data-testid="order-pin">{order.pin}</span>
            </div>
          )}
        </section>

        {canCancel && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">Tu as changé d’avis ? Tu peux annuler tant que le restaurant n’a pas accepté.</p>
            <button type="button" onClick={cancel} disabled={cancelling} data-testid="cancel-order" className="inline-flex h-10 items-center rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">
              {cancelling ? "Annulation…" : "Annuler la commande"}
            </button>
          </div>
        )}

        {!cancelled && (
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Suivi</h2>
            <ol className="relative ms-3 border-s-2 border-gray-100">
              {activeSteps.map((s, i) => (
                <li key={s} className="mb-5 ms-6 last:mb-0">
                  <span className={cn("absolute -start-[13px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", i < idx ? "bg-emerald-700 text-white" : i === idx ? "bg-emerald-700 text-white ring-4 ring-emerald-100" : "bg-gray-200 text-gray-500")}>
                    {i < idx ? "✓" : i + 1}
                  </span>
                  <h3 className={cn("font-medium", i > idx && "text-gray-400")}>{labelForStatus(s, isSmart)}</h3>
                  {i === idx && order.status !== "delivered" && <p className="text-sm text-emerald-700">Étape en cours…</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {order.status === "delivered" && isOwner && (
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <RateOrder orderId={order.id} existing={order.rating} />
          </section>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {hasPin ? (
            <MapPicker value={{ lat: order.deliveryLat, lng: order.deliveryLng }} readOnly height="h-40" className="rounded-none border-0" testId="order-map" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/images/map.jpg" alt="Plan du quartier de la Gombe, Kinshasa" className="h-28 w-full object-cover" />
          )}
          <div className="space-y-1.5 p-4 text-sm text-gray-700">
            <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden /><span>{order.address}{order.zone ? ` (${order.zone})` : ""}</span></div>
            {order.addressNotes && <div className="pl-6 text-gray-600">{order.addressNotes}</div>}
            {order.customerPhone && <div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />{formatDrcPhone(order.customerPhone)}</div>}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Articles</h2>
          <ul className="grid gap-2.5">
            {order.items.map((it: any) => (
              <li key={it.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <SafeImage src={it.imageUrl} alt={it.name} width={64} height={48} className="h-11 w-14 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.name}</div>
                    <div className="text-gray-500">× {it.quantity}</div>
                  </div>
                </div>
                <div className="shrink-0 tabular-nums">{formatPriceUSD(it.unitPriceUsd * it.quantity)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Livraison</span><span className="tabular-nums">{formatPriceUSD(order.deliveryFeeUsd)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span className="tabular-nums">{formatPriceUSD(order.totalUsd)}</span></div>
            <div className="text-xs text-gray-500">{paymentLabelFr(order.paymentMethod)}{order.vatUsd != null ? ` · dont TVA ${formatPriceUSD(order.vatUsd)}` : ""}</div>
          </div>
          {isOwner && (
            <div className="mt-4 flex flex-wrap gap-2">
              {!cancelled && (
                <Link href={`/order/${order.id}/recu`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gray-300 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50" style={{ color: "#111827" }} data-testid="receipt-link">
                  <Receipt className="h-4 w-4" aria-hidden /> Reçu
                </Link>
              )}
              {done && <ReorderButton orderId={order.id} />}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
