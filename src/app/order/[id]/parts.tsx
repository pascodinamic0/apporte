"use client";
import { useState } from "react";
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
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rate", rating: stars, comment }),
      });
      setSaved(true);
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
      <div className="mt-2 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStars(s)}
            className={`h-8 w-8 rounded-full ${
              s <= stars ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            {s}
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

