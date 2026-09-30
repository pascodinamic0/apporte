"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Restaurant } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

export function ManageRestaurants({ restaurants }: { restaurants: Restaurant[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);

  async function save(fd: FormData, id?: string) {
    setBusy(true);
    try {
      const body = {
        action: "restaurant_save",
        id,
        name: fd.get("name"),
        cuisine: fd.get("cuisine"),
        zone: fd.get("zone"),
        etaMinutes: fd.get("eta"),
        latitude: fd.get("lat"),
        longitude: fd.get("lng"),
        phone: fd.get("phone"),
        description: fd.get("description"),
        commissionPct: fd.get("commission") || null,
      };
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { toast.error("Vérifie les champs du restaurant."); return; }
      toast.success(id ? "Restaurant mis à jour" : "Restaurant créé");
      setOpen(false);
      setEdit(null);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function suspend(id: string, suspended: boolean) {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restaurant_suspend", id, suspended }) });
    if (!res.ok) { toast.error("Impossible de modifier le statut."); return; }
    toast.success(suspended ? "Restaurant suspendu" : "Restaurant réactivé");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Restaurants</h1>
          <p className="mt-1 text-sm text-gray-600">{restaurants.length} établissements. Un restaurant suspendu disparaît du catalogue.</p>
        </div>
        <button type="button" onClick={() => { setEdit(null); setOpen(true); }} className="h-10 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white" data-testid="add-restaurant">Ajouter</button>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {restaurants.map((r) => (
          <li key={r.id} className="border-b border-gray-100 last:border-0 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="truncate text-xs text-gray-600">{r.cuisine} · {r.zone} · {r.etaMinutes} min{r.commissionPct != null ? ` · commission ${r.commissionPct} %` : ""}</div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", r.suspended ? "bg-red-50 text-red-700" : r.isOpen ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-700")}>
                {r.suspended ? "Suspendu" : r.isOpen ? "Ouvert" : "Fermé"}
              </span>
              <button type="button" className="text-sm font-medium text-emerald-800" onClick={() => { setEdit(r.id); setOpen(true); }}>Modifier</button>
              <button type="button" className="text-sm font-medium text-gray-700" data-testid={`suspend-${r.id}`} onClick={() => void suspend(r.id, !r.suspended)}>{r.suspended ? "Réactiver" : "Suspendre"}</button>
            </div>
            {open && edit === r.id && <RestaurantForm restaurant={r} busy={busy} onCancel={() => setEdit(null)} onSave={(fd) => save(fd, r.id)} />}
          </li>
        ))}
      </ul>
      {open && !edit && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Nouveau restaurant</h2>
          <RestaurantForm busy={busy} onCancel={() => setOpen(false)} onSave={(fd) => save(fd)} />
        </div>
      )}
    </div>
  );
}

function RestaurantForm({ restaurant, busy, onSave, onCancel }: { restaurant?: Restaurant; busy: boolean; onSave: (fd: FormData) => void; onCancel: () => void }) {
  return (
    <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSave(new FormData(e.currentTarget)); }}>
      <Field name="name" label="Nom" defaultValue={restaurant?.name} required />
      <Field name="cuisine" label="Cuisine" defaultValue={restaurant?.cuisine} required />
      <Field name="zone" label="Zone" defaultValue={restaurant?.zone || "Gombe"} required />
      <Field name="eta" label="Délai (min)" type="number" defaultValue={String(restaurant?.etaMinutes ?? 25)} required />
      <Field name="lat" label="Latitude" defaultValue={String(restaurant?.latitude ?? -4.32)} required />
      <Field name="lng" label="Longitude" defaultValue={String(restaurant?.longitude ?? 15.31)} required />
      <Field name="phone" label="Téléphone" defaultValue={restaurant?.phone || ""} />
      <Field name="commission" label="Commission % (vide = défaut)" defaultValue={restaurant?.commissionPct != null ? String(restaurant.commissionPct) : ""} />
      <label className="sm:col-span-2 text-xs font-medium text-gray-600">Description
        <textarea name="description" defaultValue={restaurant?.description || ""} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" rows={2} />
      </label>
      <div className="sm:col-span-2 flex gap-2">
        <button disabled={busy} className="h-10 rounded-full bg-gray-900 px-4 text-sm font-semibold text-white">{busy ? "Enregistrement…" : "Enregistrer"}</button>
        <button type="button" onClick={onCancel} className="h-10 rounded-full border border-gray-300 px-4 text-sm font-semibold">Annuler</button>
      </div>
    </form>
  );
}

function Field({ name, label, defaultValue, type = "text", required }: { name: string; label: string; defaultValue?: string; type?: string; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-gray-600">{label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" />
    </label>
  );
}
