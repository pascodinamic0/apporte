"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { formatPriceUSD, paymentLabelFr } from "@/src/lib/utils";
import { formatDrcPhone } from "@/src/lib/phone";
import { SafeImage } from "@/src/components/SafeImage";
import { RateOrder } from "./parts";

const steps = [
  "placed",
  "restaurant_accepted",
  "preparing",
  "rider_searching",
  "rider_assigned",
  "going_to_restaurant",
  "arrived",
  "picked_up",
  "delivering",
  "delivered",
] as const;

function labelForStatus(s: string, isSmart: boolean) {
  switch (s) {
    case "placed":
      return "Commande passée";
    case "restaurant_accepted":
      return isSmart ? "Commande validée" : "Restaurant a accepté";
    case "preparing":
      return isSmart ? "Préparation en cours" : "En préparation";
    case "rider_searching":
      return "Recherche d’un livreur";
    case "rider_assigned":
      return "Livreur assigné";
    case "going_to_restaurant":
      return isSmart ? "En route vers le dépôt" : "En route vers le restaurant";
    case "arrived":
      return isSmart ? "Arrivé au dépôt" : "Livreur arrivé";
    case "picked_up":
      return "Commande récupérée";
    case "delivering":
      return "En livraison";
    case "delivered":
      return "Livré";
  }
  return s;
}

export function OrderClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<null | "unauthorized" | "forbidden" | "not_found">(null);

  useEffect(() => {
    let stop = false;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const data = await r.json().catch(() => ({}));
        if (stop) return;
        if (r.status === 401) setError("unauthorized");
        else if (r.status === 403) setError("forbidden");
        else if (r.status === 404) setError("not_found");
        else if (data.order) {
          setError(null);
          setOrder(data.order);
        }
      } catch {}
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [orderId]);

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
        <div className="h-28 rounded-lg bg-gray-100" />
        <div className="mt-3 h-6 w-48 rounded bg-gray-100" />
        <div className="mt-3 h-64 rounded-xl bg-gray-50" />
      </div>
    );
  }
  const isSmart = !order.restaurantId;
  const activeSteps = isSmart ? steps.filter((s) => s !== "restaurant_accepted" && s !== "preparing") : steps;
  const idx = activeSteps.indexOf(order.status);
  return (
    <>
      <div className="rounded-lg overflow-hidden mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/map.jpg" alt="Plan du quartier de la Gombe, Kinshasa" className="h-28 w-full object-cover" />
      </div>
      <h1 className="text-xl font-semibold mb-2">Commande #{order.id.slice(-6)}</h1>
      <div className="text-sm text-gray-600 mb-2">
        Total : {formatPriceUSD(order.totalUsd)} · Paiement : {paymentLabelFr(order.paymentMethod)}
      </div>
      <div className="mb-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
        <div><span className="font-medium">Adresse :</span> {order.address}{order.zone ? ` (${order.zone})` : ""}</div>
        {order.addressNotes && <div><span className="font-medium">Repère :</span> {order.addressNotes}</div>}
        {order.customerPhone && <div><span className="font-medium">Téléphone :</span> {formatDrcPhone(order.customerPhone)}</div>}
      </div>
      {order.pin && (
        <div className="mb-3 text-sm">
          Code de livraison (PIN) à donner au livreur :
          <span className="ml-2 inline-block rounded-md bg-emerald-50 px-2 py-1 font-mono text-base font-bold text-emerald-800">
            {order.pin}
          </span>
        </div>
      )}
      <Card>
        <CardHeader>Suivi</CardHeader>
        <CardContent>
          <ol className="relative border-s border-gray-200">
            {activeSteps.map((s, i) => (
              <li key={s} className="mb-6 ms-6">
                <span
                  className={`absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ${
                    i <= idx ? "bg-emerald-700 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {i + 1}
                </span>
                <h3 className="font-medium">{labelForStatus(s, isSmart)}</h3>
                {i === idx && order.status !== "delivered" && (
                  <p className="text-sm text-gray-600">Étape en cours…</p>
                )}
                {order.status === "delivered" && i === idx && (
                  <p className="text-sm text-emerald-700">Commande livrée</p>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Card className="mt-3">
        <CardHeader>Articles</CardHeader>
        <CardContent className="grid gap-2">
          {order.items.map((it: any) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <SafeImage src={it.imageUrl} alt={it.name} width={64} height={48} className="h-12 w-16 rounded object-cover" />
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-gray-600">x{it.quantity}</div>
                </div>
              </div>
              <div>{formatPriceUSD(it.unitPriceUsd * it.quantity)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      {order.status === "delivered" && <div className="mt-3"><RateOrder orderId={order.id} existing={order.rating} /></div>}
    </>
  );
}

