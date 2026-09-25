"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";

export function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let regRef: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker.ready.then((reg) => {
      regRef = reg;
      if (reg.waiting) {
        setWaiting(reg.waiting);
        setVisible(true);
      }
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(reg.waiting);
            setVisible(true);
          }
        });
      });
    });
    const onController = () => {
      // New SW has taken control; page can be reloaded automatically if we just asked for it
      // Do nothing here; user action will trigger reload.
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onController);
    };
  }, []);

  if (!visible) return null;

  function doUpdate() {
    try {
      waiting?.postMessage?.("SKIP_WAITING");
    } catch {}
    setTimeout(() => window.location.reload(), 300);
  }

  return (
    <div
      className="fixed left-0 right-0 z-[70]"
      style={{ bottom: "max(16px, calc(64px + env(safe-area-inset-bottom)))" }}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between gap-2 rounded-full bg-emerald-700 text-white px-4 py-2 shadow-lg ring-1 ring-emerald-900/20">
          <div className="text-sm">Nouvelle mise à jour disponible</div>
          <div className="flex items-center gap-2">
            <Link href="/updates">
              <Button variant="secondary" size="sm">Voir les nouveautés</Button>
            </Link>
            <Button size="sm" onClick={doUpdate}>Mettre à jour</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

