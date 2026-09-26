"use client";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { Button } from "@/src/components/ui/button";

type Req = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  resolve: (ok: boolean) => void;
};

const useConfirmStore = create<{ req: Req | null; set: (r: Req | null) => void }>((set) => ({
  req: null,
  set: (req) => set({ req }),
}));

/** In-app replacement for window.confirm(). Resolves true when confirmed. */
export function confirmDialog(opts: Omit<Req, "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    const prev = useConfirmStore.getState().req;
    if (prev) prev.resolve(false);
    useConfirmStore.getState().set({ ...opts, resolve });
  });
}

export function ConfirmDialogHost() {
  const req = useConfirmStore((s) => s.req);
  const set = useConfirmStore((s) => s.set);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const close = (ok: boolean) => {
    req?.resolve(ok);
    set(null);
  };

  useEffect(() => {
    if (!req) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-[apporte-fade_150ms_ease]" onClick={() => close(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={req.message ? "confirm-msg" : undefined}
        className="relative m-3 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-[apporte-slide-up_200ms_ease] motion-reduce:animate-none"
        style={{ marginBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <h2 id="confirm-title" className="text-lg font-semibold">{req.title}</h2>
        {req.message && <p id="confirm-msg" className="mt-1.5 text-sm text-gray-600">{req.message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => close(false)}>{req.cancelLabel || "Annuler"}</Button>
          <Button ref={confirmRef} variant={req.tone === "danger" ? "destructive" : "default"} onClick={() => close(true)}>
            {req.confirmLabel || "Confirmer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
