"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { SafeImage } from "@/src/components/SafeImage";
import toast from "react-hot-toast";

type Offer = {
  orderId: string;
  riderId: string;
  pickupDistanceKm: number;
  deliveryDistanceKm: number;
  etaMinutes: number;
  earningsUsd: number;
  expiresAt: number;
} | null;

export function RiderClient({ riderId }: { riderId: string }) {
  const [status, setStatus] = useState<"offline" | "online" | "busy">("online");
  const [offer, setOffer] = useState<Offer>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [orderCover, setOrderCover] = useState<{ url?: string; name?: string } | null>(null);
  const [orderInfo, setOrderInfo] = useState<any | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      if (status !== "online" || orderId) return;
      const r = await fetch(`/api/dispatch/offer?riderId=${riderId}`);
      const data = await r.json();
      setOffer(data.offer);
    }, 3000);
    return () => clearInterval(id);
  }, [status, orderId, riderId]);

  useEffect(() => {
    (async () => {
      if (!offer) return;
      try {
        const res = await fetch(`/api/orders/${offer.orderId}`);
        const data = await res.json();
        const o = data.order;
        const cover = o?.items?.[0]?.imageUrl || null;
        setOrderCover(cover ? { url: cover, name: o?.items?.[0]?.name } : null);
        setOrderInfo(o);
      } catch {
        setOrderCover(null);
      }
    })();
  }, [offer]);

  async function setRiderStatus(s: "offline" | "online" | "busy") {
    setStatus(s);
    await fetch(`/api/riders/${riderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
  }

  async function act(action: string) {
    // For accept/decline, use the current offer id when orderId is not yet set
    const effectiveOrderId = orderId ?? offer?.orderId ?? null;
    if (!effectiveOrderId && action !== "accept" && action !== "decline") return;
    if ((action === "accept" || action === "decline") && !effectiveOrderId) {
      toast.error("Aucune course à traiter.");
      return;
    }
    const payload: any = { action, riderId, orderId: effectiveOrderId };
    if (action === "delivered") payload.pin = pin;
    const r = await fetch("/api/dispatch/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.ok && action !== "delivered") {
      toast.error("Action non prise en compte. Réessaie.");
      return;
    }
    if (action === "accept" && offer) {
      setOrderId(offer.orderId);
      setOffer(null);
      setStatus("busy");
    } else if (action === "decline") {
      setOffer(null);
    } else if (action === "delivered" && data.delivered?.ok) {
      setOrderId(null);
      setStatus("online");
      setPin("");
    } else if (action === "delivered" && !data.delivered?.ok) {
      if (data.delivered?.reason === "bad_pin") {
        toast.error("PIN incorrect.");
      } else {
        toast.error("Impossible de terminer la course.");
      }
    }
  }

  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Livreur</h1>
      <Card>
        <CardHeader>Statut</CardHeader>
        <CardContent className="flex gap-2">
          <Button variant={status === "offline" ? "secondary" : "outline"} onClick={() => setRiderStatus("offline")}>
            Hors ligne
          </Button>
          <Button variant={status === "online" ? "secondary" : "outline"} onClick={() => setRiderStatus("online")}>
            En ligne
          </Button>
          <Button variant="outline" disabled>
            {status === "busy" ? "Occupé" : "Libre"}
          </Button>
        </CardContent>
      </Card>

      {offer && status === "online" && (
        <Card className="mt-4">
          <CardHeader>Nouvelle livraison</CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {orderCover?.url && (
              <div className="mb-1">
                <SafeImage
                  src={orderCover.url}
                  alt={orderCover.name || "Article"}
                  width={320}
                  height={160}
                  className="h-20 w-full rounded-md object-cover"
                />
              </div>
            )}
            {orderInfo && (
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="font-medium">{orderInfo.restaurantId ? "Restaurant" : "Achat Trouvailles"}</div>
                <div className="text-gray-700">{orderInfo.address}</div>
              </div>
            )}
            <div>Pickup: {offer.pickupDistanceKm} km</div>
            <div>Livraison: {offer.deliveryDistanceKm} km</div>
            <div>Temps estimé: {offer.etaMinutes} min</div>
            <div>Gain: ${offer.earningsUsd.toFixed(2)}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button className="col-span-2" onClick={() => act("accept")}>Accepter</Button>
              <Button variant="outline" onClick={() => act("decline")}>
                Refuser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orderId && (
        <Card className="mt-4">
          <CardHeader>Livraison en cours #{orderId.slice(-6)}</CardHeader>
          <CardContent className="grid gap-2">
            {orderInfo && (
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="font-medium">Adresse client</div>
                <div className="text-gray-700">{orderInfo.address}</div>
              </div>
            )}
            <Button onClick={() => {
              // Compute next step based on rough progression
              const s = orderInfo?.status;
              if (s === "rider_assigned") act("going");
              else if (s === "going_to_restaurant") act("arrived");
              else if (s === "arrived") act("picked_up");
              else if (s === "picked_up") act("delivering");
              else act("delivering");
            }}>
              Étape suivante
            </Button>
            <div className="flex items-center gap-2">
              <input
                className="h-10 w-28 rounded-md border border-gray-300 px-2"
                placeholder="PIN client"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <Button onClick={() => act("delivered")}>Terminer</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

