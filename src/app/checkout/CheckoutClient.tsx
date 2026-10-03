"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Banknote, Check, Home, Lock, MapPin, Map as MapIcon, Smartphone, Store } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SafeImage } from "@/src/components/SafeImage";
import { useCartStore } from "@/src/store/cart";
import { cn, formatPriceUSD } from "@/src/lib/utils";
import { formatDrcPhone, normalizeDrcPhone } from "@/src/lib/phone";
import type { UserRole } from "@/src/lib/types";
import type { SavedAddress } from "@/src/lib/data/ops";
import { vatIncluded } from "@/src/lib/fees";
import { unavailableCheckoutMessage } from "@/src/lib/stock";
import type { Pin } from "@/src/components/MapPicker";

const MapPicker = dynamic(() => import("@/src/components/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />,
});

type Upsell = { id: string; name: string; priceUsd: number; imageUrl?: string };

const ORDER_ERRORS: Record<string, string> = {
  invalid_phone: "Numéro invalide. Exemple : +243 81 234 5678.",
  invalid_address: "Indique une adresse de livraison plus précise (5 caractères minimum).",
  invalid_address_notes: "Les indications sont trop longues (300 caractères maximum).",
  zone_not_served: "Cette zone n’est pas encore desservie.",
  restaurant_closed: "Ce restaurant est fermé ou en pause. Réessaie plus tard ou choisis un autre restaurant.",
  invalid_restaurant: "Ce restaurant n’est plus disponible.",
  invalid_pin: "Le repère sur la carte doit être à Kinshasa.",
  payment_method_unavailable: "Ce moyen de paiement n’est pas encore disponible. Choisis le cash à la livraison.",
  invalid_payment_method: "Moyen de paiement invalide. Choisis le cash à la livraison.",
  missing_items: "Ton panier est vide.",
  invalid_items: "Un article du panier est invalide. Vide le panier et réessaie.",
  invalid_item: "Un article n’existe plus. Retire-le du panier.",
  unavailable_item: "Un plat de ton panier n’est plus disponible. Retire-le et réessaie.",
  invalid_restaurant_item: "Ton panier mélange plusieurs restaurants. Vide-le et recommence.",
  unauthorized: "Connecte-toi pour passer commande.",
  customers_only: "Seul un compte client peut passer commande.",
};

const PHONE_KEY = "apporte_checkout_phone";

type OpenState = Record<string, { open: boolean; name: string; label: string; detail?: string }>;

export function CheckoutClient({
  upsell,
  role,
  zones,
  vatPct,
  addresses,
  openState,
}: {
  upsell: Upsell[];
  role: UserRole | null;
  zones: { name: string; fee: number }[];
  vatPct: number;
  addresses: SavedAddress[];
  openState: OpenState;
}) {
  const router = useRouter();
  const { items, restaurantId, addItem, clear } = useCartStore();
  const [hydrated, setHydrated] = useState(false);
  const [address, setAddress] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<{ phone?: boolean; address?: boolean }>({});
  const [placing, setPlacing] = useState(false);
  const [zone, setZone] = useState(zones[0]?.name ?? "Gombe");
  const [pin, setPin] = useState<Pin | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveNew, setSaveNew] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Maison");
  const [stockBlock, setStockBlock] = useState<string | null>(null);
  const [stockSource, setStockSource] = useState<"api" | "menu" | null>(null);

  function applySaved(a: SavedAddress) {
    setSavedId(a.id);
    setAddress(a.address);
    setAddressNotes(a.notes || "");
    if (zones.some((z) => z.name === a.zone)) setZone(a.zone);
    setPin(a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null);
    setShowMap(a.lat != null);
    setSaveNew(false);
  }

  useEffect(() => {
    // Hydrate client-only state (persisted cart + saved phone) after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    try {
      const saved = localStorage.getItem(PHONE_KEY);
      if (saved) setPhone(saved);
    } catch {}
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (def) applySaved(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartKey = items.map((i) => `${i.kind}:${i.menuItemId || i.productId}:${i.quantity}`).join("|");
  useEffect(() => {
    if (!hydrated || !restaurantId) return;
    const food = items.filter((i) => i.kind === "food" && i.menuItemId);
    if (food.length === 0) {
      const t = window.setTimeout(() => {
        setStockBlock(null);
        setStockSource(null);
      }, 0);
      return () => window.clearTimeout(t);
    }
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}/availability`, { cache: "no-store" });
        if (!res.ok || cancel) return;
        const data = await res.json();
        const rows = Array.isArray(data.items) ? data.items : [];
        const byId = new Map<string, { name?: string; available?: boolean }>();
        for (const row of rows) {
          if (row && typeof row.id === "string") byId.set(row.id, row);
        }
        const names = food.flatMap((i) => {
          const row = byId.get(i.menuItemId as string);
          if (!row || row.available !== false) return [];
          return [typeof row.name === "string" && row.name ? row.name : i.name];
        });
        if (cancel) return;
        if (names.length) {
          setStockBlock(unavailableCheckoutMessage(names));
          setStockSource("menu");
        } else {
          setStockBlock(null);
          setStockSource(null);
        }
      } catch {
        /* the order API remains the gate */
      }
    })();
    return () => {
      cancel = true;
    };
    // cartKey captures the lines we care about; items is read from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, restaurantId, cartKey]);

  const subtotal = items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  const deliveryFee = zones.find((z) => z.name === zone)?.fee ?? zones[0]?.fee ?? 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  const vat = vatIncluded(total, vatPct);
  const rest = restaurantId ? openState[restaurantId] : undefined;
  const restClosed = !!restaurantId && (!rest || !rest.open);
  const phoneOk = normalizeDrcPhone(phone) !== null;
  const addressOk = address.trim().length >= 5;
  const canOrder = role === "customer" && zones.length > 0;

  async function placeOrder(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    // Read what is actually in the fields: on slow networks people can type
    // before React hydrates, and the DOM value is then the source of truth.
    const fd = e?.currentTarget ? new FormData(e.currentTarget) : null;
    const addressV = String(fd?.get("address") ?? address).trim();
    const notesV = String(fd?.get("notes") ?? addressNotes).trim();
    const phoneV = String(fd?.get("phone") ?? phone).trim();
    if (addressV !== address) setAddress(addressV);
    if (notesV !== addressNotes.trim()) setAddressNotes(notesV);
    if (phoneV !== phone) setPhone(phoneV);
    const normalizedPhone = normalizeDrcPhone(phoneV);
    setTouched({ phone: true, address: true });
    if (addressV.length < 5) {
      toast.error(ORDER_ERRORS.invalid_address);
      document.getElementById("address")?.focus();
      return;
    }
    if (!normalizedPhone) {
      toast.error(ORDER_ERRORS.invalid_phone);
      document.getElementById("phone")?.focus();
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          items: items.map((i) => ({ kind: i.kind, menuItemId: i.menuItemId, productId: i.productId, quantity: i.quantity })),
          address: addressV,
          addressNotes: notesV || undefined,
          customerPhone: normalizedPhone,
          zone,
          paymentMethod: "Cash on delivery",
          ...(pin ? { deliveryLat: pin.lat, deliveryLng: pin.lng } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.reason === "unavailable_item" || data.error === "unavailable_item") {
          const names = Array.isArray(data.items) ? data.items.filter((n: unknown): n is string => typeof n === "string") : [];
          const msg = unavailableCheckoutMessage(names);
          setStockBlock(msg);
          setStockSource("api");
          toast.error(msg);
          return;
        }
        toast.error(ORDER_ERRORS[data.reason] || ORDER_ERRORS[data.error] || "La commande n’a pas pu être envoyée. Réessaie.");
        return;
      }
      try {
        localStorage.setItem(PHONE_KEY, formatDrcPhone(normalizedPhone));
      } catch {}
      if (saveNew && !savedId) {
        await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: saveLabel.trim() || "Adresse", address: addressV, notes: notesV || null, zone, lat: pin?.lat ?? null, lng: pin?.lng ?? null, isDefault: addresses.length === 0 }),
        }).catch(() => null);
      }
      clear();
      toast.success("Commande envoyée au restaurant !");
      router.replace(`/order/${data.order.id}`);
    } catch {
      toast.error("Connexion perdue. Vérifie ton réseau et réessaie.");
    } finally {
      setPlacing(false);
    }
  }

  async function addUpsell(p: Upsell) {
    const ok = await addItem({
      id: `ci_${p.id}`,
      kind: "smart_find",
      productId: p.id,
      name: p.name,
      quantity: 1,
      unitPriceUsd: p.priceUsd,
      imageUrl: p.imageUrl,
    });
    if (ok) toast.success(`${p.name} ajouté`, { id: "cart-add" });
  }

  if (!hydrated) {
    return <div className="py-2"><div className="h-8 w-56 rounded-lg bg-gray-100" /><div className="mt-4 h-72 rounded-2xl bg-gray-50" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Finaliser la commande</h1>
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/empty-cart.png" alt="" className="mx-auto h-28 w-28 object-contain" />
          <h2 className="mt-4 text-lg font-semibold">Ton panier est vide</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-600">Ajoute un plat avant de passer commande.</p>
          <Link href="/food" className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-medium text-white hover:bg-emerald-800" style={{ color: "#fff" }}>
            Voir les restaurants
          </Link>
        </div>
      </div>
    );
  }

  const fieldCls = (bad: boolean) =>
    cn(
      "w-full rounded-xl border bg-white px-3 text-base placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
      bad ? "border-red-500" : "border-gray-300",
    );

  return (
    <form className="py-2" onSubmit={placeOrder} noValidate>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Finaliser la commande</h1>
      {stockBlock && (
        <div role="alert" data-testid="checkout-blocked" data-source={stockSource || undefined} className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-snug text-red-900">
          <p className="font-semibold">Commande bloquée</p>
          <p className="mt-1">{stockBlock}</p>
          <Link href="/cart" className="mt-2 inline-block font-semibold underline">Ouvrir le panier pour retirer le plat</Link>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <section className="card-elevated border border-gray-200 bg-white p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-emerald-700" aria-hidden /> Livraison</h2>
            {addresses.length > 0 && (
              <div className="mt-3" data-testid="saved-addresses">
                <div className="mb-2 text-sm font-medium">Mes adresses</div>
                <div className="flex flex-wrap gap-2">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => applySaved(a)}
                      aria-pressed={savedId === a.id}
                      className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm", savedId === a.id ? "border-emerald-700 bg-emerald-50 font-semibold text-emerald-800" : "border-gray-200 bg-white text-gray-700")}
                    >
                      <Home className="h-4 w-4" aria-hidden /> {a.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setSavedId(null); setAddress(""); setAddressNotes(""); setPin(null); }}
                    aria-pressed={savedId === null}
                    className={cn("inline-flex h-10 items-center rounded-full border px-3.5 text-sm", savedId === null ? "border-emerald-700 bg-emerald-50 font-semibold text-emerald-800" : "border-dashed border-gray-300 text-gray-600")}
                  >
                    + Nouvelle adresse
                  </button>
                </div>
              </div>
            )}
            {zones.length > 1 ? (
              <div className="mt-4 grid gap-1.5">
                <label htmlFor="zone" className="text-sm font-medium">Commune</label>
                <select id="zone" value={zone} onChange={(e) => setZone(e.target.value)} className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-base">
                  {zones.map((z) => <option key={z.name} value={z.name}>{z.name} · livraison {formatPriceUSD(z.fee)}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                  <Check className="h-4 w-4" aria-hidden /> Zone : {zone} · livraison {formatPriceUSD(deliveryFee)}
                </div>
                <p className="mt-1 text-xs text-gray-500">Nous livrons uniquement à {zone} pour l’instant.</p>
              </>
            )}
            <div className="mt-4 grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="address" className="text-sm font-medium">Adresse de livraison <span className="text-red-600">*</span></label>
                <input
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  className={cn(fieldCls(!!touched.address && !addressOk), "h-12")}
                  placeholder="Ex. 12, avenue du Commerce, immeuble Sozacom, 3e étage"
                  value={address}
                  maxLength={200}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                  aria-invalid={!!touched.address && !addressOk}
                />
                {touched.address && !addressOk && <p className="text-sm text-red-600">Indique ton adresse (5 caractères minimum).</p>}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="notes" className="text-sm font-medium">Repère et instructions <span className="font-normal text-gray-500">(facultatif)</span></label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={300}
                  className={cn(fieldCls(false), "py-2.5")}
                  placeholder="Ex. En face de la BCDC, portail bleu. Appeler en arrivant."
                  value={addressNotes}
                  onChange={(e) => setAddressNotes(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                {showMap ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Repère sur la carte <span className="font-normal text-gray-500">(aide le livreur)</span></span>
                      {pin && <button type="button" className="text-gray-500 underline" onClick={() => setPin(null)}>Effacer</button>}
                    </div>
                    <MapPicker value={pin} onChange={setPin} />
                    <p className="text-xs text-gray-500">{pin ? "Repère placé. Tu peux le déplacer." : "Touchez la carte ou utilisez « Ma position »."}</p>
                  </>
                ) : (
                  <button type="button" onClick={() => setShowMap(true)} className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50" data-testid="open-map">
                    <MapIcon className="h-4 w-4 text-emerald-700" aria-hidden /> Placer un repère sur la carte
                  </button>
                )}
              </div>
              {role === "customer" && !savedId && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="h-5 w-5 accent-emerald-700" data-testid="save-address" />
                    Enregistrer cette adresse
                  </label>
                  {saveNew && (
                    <input aria-label="Nom de l’adresse" value={saveLabel} maxLength={30} onChange={(e) => setSaveLabel(e.target.value)} className="h-10 w-40 rounded-lg border border-gray-300 bg-white px-3 text-sm" placeholder="Maison, Bureau…" />
                  )}
                </div>
              )}
              <div className="grid gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium">Téléphone <span className="text-red-600">*</span></label>
                <div className="relative">
                  <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={cn(fieldCls(!!touched.phone && !phoneOk), "h-12 pl-10")}
                    placeholder="+243 81 234 5678"
                    value={phone}
                    maxLength={20}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => {
                      setTouched((t) => ({ ...t, phone: true }));
                      const n = normalizeDrcPhone(phone);
                      if (n) setPhone(`+243 ${n.slice(4, 6)} ${n.slice(6, 9)} ${n.slice(9)}`);
                    }}
                    aria-invalid={!!touched.phone && !phoneOk}
                    aria-describedby="phone-help"
                  />
                </div>
                <p id="phone-help" className={cn("text-xs", touched.phone && !phoneOk ? "text-red-600" : "text-gray-500")}>
                  {touched.phone && !phoneOk
                    ? "Numéro congolais invalide. Format : +243 suivi de 9 chiffres (ex. +243 81 234 5678)."
                    : "Le livreur t’appelle à ce numéro. Format : +243 81 234 5678."}
                </p>
              </div>
            </div>
          </section>

          <section className="card-elevated border border-gray-200 bg-white p-4 sm:p-5">
            <h2 className="font-semibold">Paiement</h2>
            <div role="radiogroup" aria-label="Moyen de paiement" className="mt-3 grid gap-2 sm:grid-cols-2">
              <div role="radio" aria-checked="true" className="flex items-start gap-3 rounded-xl border-2 border-emerald-600 bg-emerald-50/60 p-3">
                <Banknote className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">Cash à la livraison</div>
                  <div className="text-xs text-gray-600">Tu paies le livreur à la réception, en USD ou en francs congolais.</div>
                </div>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3.5 w-3.5" aria-hidden /></span>
              </div>
              <div role="radio" aria-checked="false" aria-disabled="true" className="flex cursor-not-allowed items-start gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-gray-500">
                <Smartphone className="mt-0.5 h-5 w-5" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-semibold">
                    Mobile Money
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Bientôt disponible</span>
                  </div>
                  <div className="text-xs">M-Pesa, Orange Money, Airtel Money.</div>
                </div>
              </div>
            </div>
          </section>

          {upsell.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">Ajouter à ma livraison</h2>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                {upsell.map((p) => (
                  <div key={p.id} className="card-elevated flex items-center gap-3 border border-gray-200 bg-white p-3 sm:flex-col sm:items-stretch">
                    <SafeImage src={p.imageUrl} alt={p.name} width={240} height={160} className="h-16 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-full" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-sm font-semibold text-emerald-800">{formatPriceUSD(p.priceUsd)}</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addUpsell(p)}>Ajouter</Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="card-elevated border border-gray-200 bg-white p-4 sm:p-5 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Récapitulatif</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{i.name} <span className="text-gray-500">× {i.quantity}</span></span>
                <span className="shrink-0 tabular-nums">{formatPriceUSD(i.unitPriceUsd * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-1.5 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Sous-total</span><span className="tabular-nums">{formatPriceUSD(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Livraison ({zone})</span><span className="tabular-nums" data-testid="checkout-fee">{formatPriceUSD(deliveryFee)}</span></div>
            <div className="mt-1 flex justify-between text-base font-bold"><span>Total</span><span className="tabular-nums text-emerald-800" data-testid="checkout-total">{formatPriceUSD(total)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>dont TVA ({vatPct} %)</span><span className="tabular-nums" data-testid="checkout-vat">{formatPriceUSD(vat)}</span></div>
            <div className="text-xs text-gray-500">À payer en cash au livreur.</div>
          </div>
          {restClosed && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" data-testid="checkout-closed">
              <Store className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <div className="font-semibold">{rest?.name ?? "Ce restaurant"} : {rest?.label?.toLowerCase() ?? "fermé"}</div>
                <div>{rest?.detail ?? "Il ne prend pas de commandes pour le moment."}</div>
              </div>
            </div>
          )}
          {canOrder ? (
            <Button type="submit" size="lg" className="mt-4 w-full rounded-xl" disabled={placing || restClosed || !!stockBlock}>
              {placing ? "Envoi…" : stockBlock ? "Commande bloquée" : `Commander · ${formatPriceUSD(total)}`}
            </Button>
          ) : (
            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <div className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4" aria-hidden />{role ? "Compte client requis" : "Connexion requise"}</div>
              <p className="mt-1 text-gray-600">{role ? "Connecte-toi avec un compte client pour commander." : "Connecte-toi pour passer commande."}</p>
              <Link href="/demo" className="mt-2 inline-block font-medium">Se connecter</Link>
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}
