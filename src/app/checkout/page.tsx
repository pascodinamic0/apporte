import type { Metadata } from "next";
import { getCurrentUser } from "@/src/lib/auth";
import { listSmartFinds } from "@/src/lib/data/db";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finaliser la commande" };

export default async function CheckoutPage() {
  const [user, products] = await Promise.all([getCurrentUser(), listSmartFinds()]);
  const upsell = products
    .filter((p) => p.stock > 0)
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.name, priceUsd: p.priceUsd, imageUrl: p.imageUrl }));
  return <CheckoutClient upsell={upsell} role={user?.role ?? null} />;
}
