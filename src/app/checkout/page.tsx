import type { Metadata } from "next";
import { getCurrentUser } from "@/src/lib/auth";
import { getRestaurants, listSmartFinds } from "@/src/lib/data/db";
import { activeZones, getFeeSettings } from "@/src/lib/data/settings";
import { listAddresses } from "@/src/lib/data/ops";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finaliser la commande" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const [products, zones, fees, restaurants, addresses] = await Promise.all([
    listSmartFinds(),
    activeZones(),
    getFeeSettings(),
    getRestaurants(),
    user?.role === "customer" ? listAddresses(user.id) : Promise.resolve([]),
  ]);
  const upsell = products
    .filter((p) => p.stock > 0)
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.name, priceUsd: p.priceUsd, imageUrl: p.imageUrl }));
  const openState = Object.fromEntries(
    restaurants.map((r) => [r.id, { open: r.isOpen, name: r.name, label: r.availability?.label ?? "Fermé", detail: r.availability?.detail }]),
  );
  return (
    <CheckoutClient
      upsell={upsell}
      role={user?.role ?? null}
      zones={zones.map((z) => ({ name: z.name, fee: z.deliveryFeeUsd }))}
      vatPct={fees.vatPct}
      addresses={addresses}
      openState={openState}
    />
  );
}
