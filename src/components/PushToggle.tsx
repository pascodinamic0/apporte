"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bell, BellOff } from "lucide-react";
import { currentSubscription, disablePush, enablePush, pushSupport, type PushSupport } from "@/src/lib/client/push";
import { Switch } from "./ui/switch";

const COPY: Record<string, string> = {
  customer: "Suivi de commande : acceptée, en route, livrée.",
  merchant: "Chaque nouvelle commande, même écran éteint.",
  rider: "Chaque nouvelle course disponible.",
  admin: "Alertes de la plateforme.",
};

export function PushToggle({ role, compact = false }: { role: string; compact?: boolean }) {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    if (s === "granted") currentSubscription().then((sub) => setOn(!!sub));
  }, []);

  const note =
    support === "unsupported"
      ? "Ce navigateur ne gère pas les notifications push : les alertes s’affichent dans l’application."
      : support === "needs_install"
        ? "Sur iPhone, ajoute Apporte à l’écran d’accueil pour recevoir les notifications. En attendant, les alertes s’affichent dans l’application."
        : support === "denied"
          ? "Notifications bloquées dans les réglages du navigateur. Les alertes s’affichent dans l’application."
          : COPY[role] || COPY.customer;

  return (
    <div className={compact ? "" : "rounded-2xl border border-gray-200 bg-white p-4"} data-testid="push-toggle" data-support={support}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            {on ? <Bell className="h-4 w-4" aria-hidden /> : <BellOff className="h-4 w-4" aria-hidden />}
          </span>
          <div className="min-w-0">
            <div className="font-medium">Notifications</div>
            <p className="text-sm text-gray-600">{note}</p>
          </div>
        </div>
        {(support === "default" || support === "granted") && (
          <Switch
            checked={on}
            disabled={busy}
            label="Notifications push"
            onChange={async (v) => {
              setBusy(true);
              try {
                if (v) {
                  const r = await enablePush();
                  if (r.ok) {
                    setOn(true);
                    toast.success("Notifications activées");
                    fetch("/api/push/test", { method: "POST" }).catch(() => {});
                  } else {
                    setSupport(pushSupport());
                    toast.error(r.reason === "denied" ? "Autorisation refusée." : "Activation impossible.");
                  }
                } else {
                  await disablePush();
                  setOn(false);
                  toast.success("Notifications désactivées");
                }
              } catch {
                toast.error("Activation impossible sur ce navigateur.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
