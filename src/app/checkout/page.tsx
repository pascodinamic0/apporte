"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { useCartStore } from "@/src/store/cart";
import { formatPriceUSD } from "@/src/lib/utils";
import type { OrderItem, PaymentMethod } from "@/src/lib/types";
import { SafeImage } from "@/src/components/SafeImage";

// Simple client copy of smart finds for upsell (for demo; avoid server import)
const SMART_FIND_IDS = [
  "sf_powerbank",
  "sf_compressor",
  "sf_lamp",
  "sf_fast_charger",
  "sf_phone_holder",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, restaurantId, addItem, clear } = useCartStore();
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState("Gombe");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Mobile Money");
  const [placing, setPlacing] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  const deliveryFee = restaurantId ? 2.5 : 3;
  const total = subtotal + deliveryFee;

  const upsellProducts = useMemo(() => {
    // hard-coded minimal items; in a full app we'd fetch these
    const map: Record<
      string,
      { id: string; name: string; priceUsd: number; imageUrl?: string }
    > = {
      sf_powerbank: {
        id: "sf_powerbank",
        name: "Power bank 20,000 mAh",
        priceUsd: 18,
        imageUrl: "/images/powerbank.png",
      },
      sf_compressor: {
        id: "sf_compressor",
        name: "Compresseur portable",
        priceUsd: 25,
        imageUrl: "/images/compressor.png",
      },
      sf_lamp: {
        id: "sf_lamp",
        name: "Lampe rechargeable",
        priceUsd: 12,
        imageUrl: "/images/lamp.png",
      },
      sf_fast_charger: {
        id: "sf_fast_charger",
        name: "Chargeur rapide 20W",
        priceUsd: 9,
        imageUrl: "/images/charger.png",
      },
      sf_phone_holder: {
        id: "sf_phone_holder",
        name: "Support téléphone",
        priceUsd: 7,
        imageUrl: "/images/holder.png",
      },
    };
    return SMART_FIND_IDS.map((id) => map[id]).slice(0, 3);
  }, []);

  async function placeOrder() {
    if (!address) {
      alert("Indique ton adresse de livraison.");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          items,
          address,
          zone,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      clear();
      router.replace(`/order/${data.order.id}`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la commande (mode démo).");
    } finally {
      setPlacing(false);
    }
  }

  function addUpsell(p: { id: string; name: string; priceUsd: number; imageUrl?: string }) {
    addItem({
      id: `ci_${p.id}`,
      kind: "smart_find",
      productId: p.id,
      name: p.name,
      quantity: 1,
      unitPriceUsd: p.priceUsd,
      imageUrl: p.imageUrl,
    });
  }

  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Paiement</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>Adresse de livraison</CardHeader>
          <CardContent className="grid gap-3">
            <Input
              placeholder="Rue, référence, immeuble..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Select value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="Gombe">Gombe (zone pilote)</option>
              <option value="Kinshasa">Kinshasa</option>
            </Select>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="Mobile Money">Mobile Money</option>
              <option value="Cash on delivery">Espèces (à la livraison)</option>
              <option value="Card">Carte</option>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Résumé</CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="grid gap-2">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between">
                  <span className="truncate">{i.name} × {i.quantity}</span>
                  <span>{formatPriceUSD(i.unitPriceUsd * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span>Sous-total</span>
              <span>{formatPriceUSD(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Livraison</span>
              <span>{formatPriceUSD(deliveryFee)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-emerald-800">
              <span>Total</span>
              <span>{formatPriceUSD(total)}</span>
            </div>
            <Button className="mt-3 whitespace-nowrap" onClick={placeOrder} disabled={placing || items.length === 0}>
              {placing ? "Traitement..." : "Confirmer la commande"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Ajouter à ma livraison</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {upsellProducts.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="font-medium">{p.name}</div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <SafeImage
                  src={p.imageUrl}
                  alt={p.name}
                  width={160}
                  height={100}
                  className="h-16 w-28 rounded-md object-cover"
                />
                <div className="text-emerald-800 font-medium">{formatPriceUSD(p.priceUsd)}</div>
                <Button variant="outline" onClick={() => addUpsell(p)}>
                  Ajouter
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

