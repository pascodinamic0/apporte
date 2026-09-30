"use client";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { MenuItem } from "@/src/lib/types";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Switch } from "@/src/components/ui/switch";
import { Sheet } from "@/src/components/ui/sheet";
import { SafeImage } from "@/src/components/SafeImage";
import { PhotoInput } from "@/src/components/PhotoInput";
import { confirmDialog } from "@/src/components/ConfirmDialog";
import { cn, formatPriceUSD } from "@/src/lib/utils";
import { parseMenuPrice } from "@/src/lib/price";

const BASE_CATEGORIES = ["Entrées", "Plats", "Grillades", "Accompagnements", "Desserts", "Boissons"];

type Draft = { id?: string; name: string; description: string; price: string; category: string; newCategory: string; available: boolean; imageUrl: string | null };

function emptyDraft(category = "Plats"): Draft {
  return { name: "", description: "", price: "", category, newCategory: "", available: true, imageUrl: null };
}

export function MerchantMenuClient({ initialMenu }: { restaurantId: string; initialMenu: MenuItem[] }) {
  const [menu, setMenu] = useState<MenuItem[]>(initialMenu);
  const [filter, setFilter] = useState<string>("Tout");
  const [draft, setDraft] = useState<Draft | null>(null);

  const categories = useMemo(() => {
    const used = Array.from(new Set(menu.map((m) => m.category || "Plats")));
    const ordered = BASE_CATEGORIES.filter((c) => used.includes(c));
    return [...ordered, ...used.filter((c) => !BASE_CATEGORIES.includes(c)).sort()];
  }, [menu]);
  const allCategories = useMemo(() => Array.from(new Set([...BASE_CATEGORIES, ...categories])), [categories]);
  const available = menu.filter((m) => m.available).length;
  const shown = filter === "Tout" ? categories : categories.filter((c) => c === filter);

  const upsert = (item: MenuItem) => setMenu((cur) => (cur.some((x) => x.id === item.id) ? cur.map((x) => (x.id === item.id ? item : x)) : [...cur, item]));

  async function toggle(item: MenuItem) {
    upsert({ ...item, available: !item.available });
    const r = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    }).catch(() => null);
    if (!r?.ok) {
      upsert(item);
      toast.error("Modification non enregistrée. Réessaie.");
    } else toast.success(!item.available ? "Plat de nouveau disponible" : "Plat marqué indisponible");
  }

  async function remove(item: MenuItem) {
    const ok = await confirmDialog({
      title: `Supprimer « ${item.name} » ?`,
      message: "Le plat disparaît du menu. Les anciennes commandes restent intactes.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    const r = await fetch(`/api/menu/${item.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return void toast.error("Suppression impossible. Réessaie.");
    setMenu((cur) => cur.filter((x) => x.id !== item.id));
    toast.success("Plat supprimé");
  }

  return (
    <div className="py-2">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Menu</h1>
          <p className="mt-1 text-sm text-gray-600">
            {menu.length} plat{menu.length > 1 ? "s" : ""} · {available} disponible{available > 1 ? "s" : ""} · {categories.length} catégorie{categories.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setDraft(emptyDraft(filter !== "Tout" ? filter : "Plats"))} data-testid="add-dish" className="rounded-full">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Ajouter un plat
        </Button>
      </div>

      <nav aria-label="Catégories" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {["Tout", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={cn("h-9 shrink-0 rounded-full border px-4 text-sm font-medium", filter === c ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-200 bg-white text-gray-700")}
          >
            {c}
            {c !== "Tout" && <span className="ml-1.5 text-xs opacity-70">{menu.filter((m) => (m.category || "Plats") === c).length}</span>}
          </button>
        ))}
      </nav>

      {menu.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-600">Aucun plat pour l’instant.</p>
          <Button className="mt-4 rounded-full" onClick={() => setDraft(emptyDraft())}>Ajouter mon premier plat</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {shown.map((cat) => (
            <section key={cat} aria-label={cat} data-category={cat}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">{cat}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {menu
                  .filter((m) => (m.category || "Plats") === cat)
                  .map((m) => (
                    <article key={m.id} data-dish-id={m.id} className={cn("flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm", !m.available && "bg-gray-50")}>
                      <SafeImage src={m.imageUrl} alt={m.name} width={220} height={180} className={cn("h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28", !m.available && "grayscale opacity-70")} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold leading-tight">{m.name}</h3>
                          <span className="shrink-0 font-bold tabular-nums" data-testid="dish-price">{formatPriceUSD(m.priceUsd)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{m.description}</p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                            <Switch checked={m.available} onChange={() => toggle(m)} label={`Disponible : ${m.name}`} testId="dish-available" />
                            {m.available ? "Disponible" : "Indisponible"}
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label={`Modifier ${m.name}`}
                              data-testid="edit-dish"
                              onClick={() => setDraft({ id: m.id, name: m.name, description: m.description || "", price: String(m.priceUsd), category: m.category || "Plats", newCategory: "", available: m.available, imageUrl: m.imageUrl || null })}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button type="button" aria-label={`Supprimer ${m.name}`} data-testid="delete-dish" onClick={() => remove(m)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {draft && <DishForm draft={draft} categories={allCategories} onClose={() => setDraft(null)} onSaved={(item) => { upsert(item); setDraft(null); }} />}
    </div>
  );
}

function DishForm({ draft: initial, categories, onClose, onSaved }: { draft: Draft; categories: string[]; onClose: () => void; onSaved: (m: MenuItem) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    const e: Record<string, string> = {};
    const name = d.name.trim();
    if (name.length < 2) e.name = "Donne un nom au plat (2 caractères minimum).";
    const price = parseMenuPrice(d.price);
    if (price === null) e.price = "Prix invalide (ex. 7.50).";
    const category = d.category === "__new" ? d.newCategory.trim() : d.category;
    if (!category || category.length < 2) e.category = "Choisis ou crée une catégorie.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const body = { name, description: d.description.trim() || null, priceUsd: price, category, available: d.available, imageUrl: d.imageUrl };
      const res = await fetch(d.id ? `/api/menu/${d.id}` : "/api/merchant/menu", {
        method: d.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.item) throw new Error(data.reason || String(res.status));
      toast.success(d.id ? "Plat mis à jour" : "Plat ajouté au menu");
      onSaved(data.item);
    } catch {
      toast.error("Enregistrement impossible. Vérifie les champs et réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={d.id ? "Modifier le plat" : "Nouveau plat"}
      testId="dish-form"
      width="md:w-[520px]"
      footer={
        <div className="grid grid-cols-2 gap-2 pb-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={saving} data-testid="save-dish">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <PhotoInput value={d.imageUrl} onChange={(u) => set("imageUrl", u)} />
        <div>
          <label htmlFor="dish-name" className="mb-1.5 block text-sm font-medium">Nom du plat</label>
          <Input id="dish-name" value={d.name} maxLength={80} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} placeholder="Ex. Poulet mayo" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="dish-desc" className="mb-1.5 block text-sm font-medium">Description <span className="font-normal text-gray-500">(facultatif)</span></label>
          <textarea id="dish-desc" value={d.description} maxLength={300} rows={3} onChange={(e) => set("description", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" placeholder="Ingrédients, portion…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="dish-price" className="mb-1.5 block text-sm font-medium">Prix (USD)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input id="dish-price" inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} className="pl-7 tabular-nums" aria-invalid={!!errors.price} placeholder="7.50" />
            </div>
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>
          <div>
            <label htmlFor="dish-cat" className="mb-1.5 block text-sm font-medium">Catégorie</label>
            <select id="dish-cat" value={d.category} onChange={(e) => set("category", e.target.value)} className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new">+ Nouvelle catégorie…</option>
            </select>
          </div>
        </div>
        {d.category === "__new" && (
          <div>
            <label htmlFor="dish-newcat" className="mb-1.5 block text-sm font-medium">Nom de la catégorie</label>
            <Input id="dish-newcat" value={d.newCategory} maxLength={30} onChange={(e) => set("newCategory", e.target.value)} placeholder="Ex. Menus midi" />
          </div>
        )}
        {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
        <label className="flex items-center justify-between rounded-2xl border border-gray-200 p-3">
          <span>
            <span className="block text-sm font-medium">Disponible à la commande</span>
            <span className="text-xs text-gray-500">Désactive si le plat est en rupture.</span>
          </span>
          <Switch checked={d.available} onChange={(v) => set("available", v)} label="Disponible" />
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
