"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { DECLINE_OTHER, DECLINE_PRESETS, STOCKOUT_REASON } from "@/src/lib/decline";
import { cn } from "@/src/lib/utils";

const OTHER = "__other__";

export function DeclineDialog({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const titleId = useId();
  const [choice, setChoice] = useState<string>(DECLINE_PRESETS[0]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    setChoice(DECLINE_PRESETS[0]);
    setText("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, busy, onClose]);

  if (!open) return null;
  const reason = choice === OTHER ? text.trim() : choice;
  const valid = reason.length >= 2 && reason.length <= 200;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="decline-dialog"
        className="relative m-3 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        style={{ marginBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <h2 id={titleId} className="text-lg font-bold tracking-tight">Refuser la commande</h2>
        <p className="mt-1 text-sm text-gray-600">Le client verra le motif. Aucun livreur ne sera appelé.</p>
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Motif du refus">
          {DECLINE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={choice === preset}
              data-reason={preset}
              onClick={() => setChoice(preset)}
              className={cn(
                "h-11 rounded-xl border px-3 text-left text-sm",
                choice === preset ? "border-red-600 bg-red-50 font-semibold text-red-800" : "border-gray-200 bg-white",
              )}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={choice === OTHER}
            data-reason={DECLINE_OTHER}
            onClick={() => setChoice(OTHER)}
            className={cn(
              "h-11 rounded-xl border px-3 text-left text-sm",
              choice === OTHER ? "border-red-600 bg-red-50 font-semibold text-red-800" : "border-gray-200 bg-white",
            )}
          >
            {DECLINE_OTHER}
          </button>
        </div>
        {choice === OTHER && (
          <label className="mt-3 block text-sm">
            <span className="font-medium">Précise le motif</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 200))}
              rows={3}
              maxLength={200}
              data-testid="decline-freetext"
              placeholder="Quelques mots pour le client"
              className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-base"
            />
          </label>
        )}
        {choice === STOCKOUT_REASON && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="stockout-note">
            Les plats de cette commande seront marqués indisponibles. Le prochain client ne pourra plus les commander.
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !valid}
            data-action="merchant_reject"
            data-testid="decline-confirm"
            onClick={() => onConfirm(reason)}
          >
            {busy ? "Refus…" : "Refuser"}
          </Button>
        </div>
      </div>
    </div>
  );
}
