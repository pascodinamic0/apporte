"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Restaurant } from "@/src/lib/types";
import { DEFAULT_HOURS, restaurantAvailability, type WeekHours } from "@/src/lib/hours";
import { HoursEditor } from "@/src/components/HoursEditor";
import { Switch } from "@/src/components/ui/switch";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export function HoursClient({ restaurant }: { restaurant: Restaurant }) {
  const [hours, setHours] = useState<WeekHours>(restaurant.hours ?? DEFAULT_HOURS);
  const [accepting, setAccepting] = useState(restaurant.acceptingOrders !== false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const av = restaurantAvailability({ acceptingOrders: accepting, hours, suspended: restaurant.suspended });

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/merchant/restaurant", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    return res?.ok ? data : Promise.reject(data?.reason);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Horaires d’ouverture</h2>
        <HoursEditor value={hours} onChange={(h) => { setHours(h); setDirty(true); }} />
        <p className="mt-2 text-xs text-gray-500">Heure de Kinshasa. En dehors de ces horaires, les clients voient « Fermé » et ne peuvent pas commander.</p>
        <div className="mt-4 flex gap-2">
          <Button
            disabled={!dirty || saving}
            data-testid="save-hours"
            onClick={async () => {
              setSaving(true);
              try {
                await patch({ hours });
                setDirty(false);
                toast.success("Horaires enregistrés");
              } catch (r) {
                toast.error(r === "empty_range" ? "Une journée a la même heure d’ouverture et de fermeture." : "Horaires non enregistrés. Réessaie.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer les horaires"}
          </Button>
          {dirty && <Button variant="outline" onClick={() => { setHours(restaurant.hours ?? DEFAULT_HOURS); setDirty(false); }}>Annuler</Button>}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Prendre des commandes</div>
              <div className="text-sm text-gray-600">Mettez en pause en cas de rush ou de rupture.</div>
            </div>
            <Switch
              checked={accepting}
              label="Prendre des commandes"
              testId="open-switch"
              onChange={async (v) => {
                setAccepting(v);
                try {
                  await patch({ acceptingOrders: v });
                  toast.success(v ? "Restaurant ouvert aux commandes" : "Commandes en pause");
                } catch {
                  setAccepting(!v);
                  toast.error("Impossible de changer l’état.");
                }
              }}
            />
          </div>
        </div>
        <div className={cn("rounded-3xl p-5", av.open ? "bg-emerald-50 text-emerald-900" : "bg-gray-100 text-gray-800")} data-testid="availability-preview">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Ce que voient les clients</div>
          <div className="mt-1 text-xl font-bold">{av.open ? "Ouvert" : av.label}</div>
          {av.detail && <div className="text-sm">{av.detail}</div>}
        </div>
      </aside>
    </div>
  );
}
