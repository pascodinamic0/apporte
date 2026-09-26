"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import type { MenuItem } from "@/src/lib/types";
import { Button } from "@/src/components/ui/button";
import { SafeImage } from "@/src/components/SafeImage";
import { Stagger } from "@/src/components/Stagger";
import { cn, formatPriceUSD } from "@/src/lib/utils";
import { parseMenuPrice } from "@/src/lib/price";

export function MerchantMenuClient({ initialMenu }: { restaurantId: string; initialMenu: MenuItem[] }) {
  const [menu, setMenu] = useState<MenuItem[]>(initialMenu);
  useEffect(() => setMenu(initialMenu), [initialMenu]);

  const available = menu.filter((m) => m.available).length;
  return (
    <div className="py-2">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Menu</h1>
          <p className="mt-1 text-sm text-gray-600">
            {menu.length} plat{menu.length > 1 ? "s" : ""} · {available} disponible{available > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      {menu.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
          Aucun plat pour l’instant.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Stagger>
            {menu.map((m) => (
              <MenuRow key={m.id} item={m} onChange={(next) => setMenu((cur) => cur.map((x) => (x.id === next.id ? next : x)))} />
            ))}
          </Stagger>
        </div>
      )}
    </div>
  );
}

function MenuRow({ item, onChange }: { item: MenuItem; onChange: (m: MenuItem) => void }) {
  const [draft, setDraft] = useState(String(item.priceUsd));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [toggling, setToggling] = useState(false);
  const dirty = draft.trim().replace(",", ".") !== String(item.priceUsd);

  async function savePrice() {
    if (!dirty || saving) return;
    const price = parseMenuPrice(draft);
    if (price === null) {
      setError(draft.trim() === "" ? "Le prix est obligatoire." : "Prix invalide (ex. 7.50, entre 0.01 et 1000 $).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const r = await fetch(`/api/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceUsd: price }),
      });
      if (!r.ok) throw new Error(String(r.status));
      onChange({ ...item, priceUsd: price });
      setDraft(String(price));
      setSavedAt(Date.now());
      toast.success(`Prix enregistré : ${formatPriceUSD(price)}`);
    } catch {
      toast.error("Prix non enregistré. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    setToggling(true);
    try {
      const r = await fetch(`/api/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available }),
      });
      if (!r.ok) throw new Error(String(r.status));
      onChange({ ...item, available: !item.available });
      toast.success(!item.available ? "Plat de nouveau disponible" : "Plat marqué indisponible");
    } catch {
      toast.error("Modification non enregistrée. Réessaie.");
    } finally {
      setToggling(false);
    }
  }

  const inputId = `price-${item.id}`;
  return (
    <div className={cn("card-elevated flex h-full flex-col gap-3 border border-gray-200 bg-white p-4", !item.available && "bg-gray-50")}>
      <div className="flex gap-3">
        <SafeImage src={item.imageUrl} alt={item.name} width={200} height={150} className={cn("h-20 w-24 shrink-0 rounded-xl object-cover", !item.available && "grayscale")} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{item.name}</div>
          <div className="line-clamp-2 text-sm text-gray-600">{item.description}</div>
          <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", item.available ? "bg-emerald-50 text-emerald-800" : "bg-gray-200 text-gray-700")}>
            {item.available ? "Disponible" : "Indisponible"}
          </span>
        </div>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          savePrice();
        }}
      >
        <div className="grid gap-1">
          <label htmlFor={inputId} className="text-xs font-medium text-gray-600">Prix (USD)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              id={inputId}
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={!!error}
              className={cn(
                "h-11 w-28 rounded-md border bg-white pl-7 pr-2 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                error ? "border-red-500" : "border-gray-300",
              )}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
                setSavedAt(null);
              }}
              onBlur={savePrice}
            />
          </div>
        </div>
        <Button type="submit" variant={dirty ? "default" : "outline"} disabled={!dirty || saving} className="h-11">
          {saving ? "…" : savedAt && !dirty ? (<><Check className="mr-1 h-4 w-4" aria-hidden />Enregistré</>) : "Enregistrer"}
        </Button>
        <Button type="button" variant="outline" className="ml-auto h-11" onClick={toggle} disabled={toggling}>
          {item.available ? "Marquer indisponible" : "Remettre en vente"}
        </Button>
        {error && <p role="alert" className="basis-full text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
