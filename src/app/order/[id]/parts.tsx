"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export function RateOrder({
  orderId,
  existing,
}: {
  orderId: string;
  existing?: { stars: 1 | 2 | 3 | 4 | 5; comment?: string };
}) {
  const [stars, setStars] = useState<number>(existing?.stars ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing);
  async function onSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rate", rating: stars, comment }),
      });
      if (res.ok) {
        setSaved(true);
        toast.success("Merci pour ton avis !");
      } else {
        // Keep form visible if server refused (e.g., not delivered, already rated, invalid)
        const data = await res.json().catch(() => ({}));
        const reasons: Record<string, string> = {
          already_rated: "Tu as déjà noté cette commande.",
          not_delivered: "Tu pourras noter la commande après la livraison.",
          invalid_rating: "Choisis une note entre 1 et 5 étoiles.",
        };
        toast.error(reasons[data?.reason] || "Impossible d’enregistrer l’avis. Réessaie.");
        if (data?.reason === "already_rated") setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }
  if (saved) {
    return <div className="mt-3 text-emerald-800">Merci pour ton avis !</div>;
  }
  return (
    <div className="mt-3">
      <div className="text-lg font-semibold">Évaluer la commande</div>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Note sur 5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={s === stars}
            aria-label={`${s} étoile${s > 1 ? "s" : ""}`}
            onClick={() => setStars(s)}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-amber-50"
          >
            <Star className={`h-7 w-7 ${s <= stars ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} aria-hidden />
          </button>
        ))}
      </div>
      <textarea
        className="mt-2 w-full rounded-md border border-gray-300 p-2 text-sm"
        placeholder="Un commentaire (optionnel)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button className="mt-2" onClick={onSave} disabled={saving}>
        Envoyer
      </Button>
    </div>
  );
}

