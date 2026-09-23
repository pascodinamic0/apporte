\"use client\";
import { useEffect, useState } from \"react\";
import { Card, CardContent, CardHeader } from \"@/src/components/ui/card\";
import { Button } from \"@/src/components/ui/button\";

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
  const [status, setStatus] = useState<\"offline\" | \"online\" | \"busy\">(\"online\");
  const [offer, setOffer] = useState<Offer>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pin, setPin] = useState(\"\");

  useEffect(() => {
    const id = setInterval(async () => {
      if (status !== \"online\" || orderId) return;
      const r = await fetch(`/api/dispatch/offer?riderId=${riderId}`);
      const data = await r.json();
      setOffer(data.offer);
    }, 3000);
    return () => clearInterval(id);
  }, [status, orderId, riderId]);

  async function setRiderStatus(s: \"offline\" | \"online\" | \"busy\") {
    setStatus(s);
    await fetch(`/api/riders/${riderId}/status`, {
      method: \"PATCH\",
      headers: { \"Content-Type\": \"application/json\" },
      body: JSON.stringify({ status: s }),
    });
  }

  async function act(action: string) {
    if (!orderId && action !== \"accept\" && action !== \"decline\") return;
    const payload: any = { action, riderId, orderId };
    if (action === \"delivered\") payload.pin = pin;
    const r = await fetch(\"/api/dispatch/offer\", {
      method: \"POST\",
      headers: { \"Content-Type\": \"application/json\" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (action === \"accept\" && offer) {
      setOrderId(offer.orderId);
      setOffer(null);
      setStatus(\"busy\");
    } else if (action === \"decline\") {
      setOffer(null);
    } else if (action === \"delivered\" && data.delivered?.ok) {
      setOrderId(null);
      setStatus(\"online\");
      setPin(\"\");
    }
  }

  return (
    <div className=\"py-2\">
      <h1 className=\"text-xl font-semibold mb-3\">Livreur</h1>
      <Card>
        <CardHeader>Statut</CardHeader>
        <CardContent className=\"flex gap-2\">
          <Button
            variant={status === \"offline\" ? \"secondary\" : \"outline\"}
            onClick={() => setRiderStatus(\"offline\")}
          >
            Offline
          </Button>
          <Button
            variant={status === \"online\" ? \"secondary\" : \"outline\"}
            onClick={() => setRiderStatus(\"online\")}
          >
            Online
          </Button>
          <Button variant=\"outline\" disabled>
            {status === \"busy\" ? \"Occupé\" : \"Libre\"}
          </Button>
        </CardContent>
      </Card>

      {offer && status === \"online\" && (
        <Card className=\"mt-4\">
          <CardHeader>Nouvelle livraison</CardHeader>
          <CardContent className=\"grid gap-2 text-sm\">
            <div>Pickup: {offer.pickupDistanceKm} km</div>
            <div>Livraison: {offer.deliveryDistanceKm} km</div>
            <div>Temps estimé: {offer.etaMinutes} min</div>
            <div>Gain: ${offer.earningsUsd.toFixed(2)}</div>
            <div className=\"flex gap-2 mt-2\">
              <Button onClick={() => act(\"accept\")}>Accepter</Button>
              <Button variant=\"outline\" onClick={() => act(\"decline\")}>
                Refuser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orderId && (
        <Card className=\"mt-4\">
          <CardHeader>Livraison en cours #{orderId.slice(-6)}</CardHeader>
          <CardContent className=\"grid gap-2\">
            <div className=\"flex gap-2\">
              <Button variant=\"outline\" onClick={() => act(\"going\")}>
                Vers pickup
              </Button>
              <Button variant=\"outline\" onClick={() => act(\"arrived\")}>
                Arrivé
              </Button>
              <Button variant=\"outline\" onClick={() => act(\"picked_up\")}>
                Récupéré
              </Button>
              <Button variant=\"outline\" onClick={() => act(\"delivering\")}>
                En livraison
              </Button>
            </div>
            <div className=\"flex items-center gap-2\">
              <input
                className=\"h-10 w-28 rounded-md border border-gray-300 px-2\"
                placeholder=\"PIN client\"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <Button onClick={() => act(\"delivered\")}>Terminer</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

