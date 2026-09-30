import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { listMenuForMerchant } from "@/src/lib/data/ops";
import { AccessRequired } from "@/src/components/AccessRequired";
import { MerchantMenuClient } from "./MerchantMenuClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gérer le menu" };

export default async function MerchantMenu() {
  const user = await requireRole(["merchant"]);
  if (!user || !user.merchantId) return <AccessRequired role="commerçant" />;
  const initialMenu = await listMenuForMerchant(user.merchantId);
  return <MerchantMenuClient restaurantId={user.merchantId} initialMenu={initialMenu} />;
}
