import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { getMenuForRestaurant } from "@/src/lib/data/memory";
import { MerchantMenuClient } from "./MerchantMenuClient";

export default async function MerchantMenu() {
  const user = await requireRole(["merchant"]);
  if (!user || !user.merchantId) {
    return (
      <div className="py-6">
        <div className="text-lg">Accès commerçant requis.</div>
        <Link href="/demo" className="text-emerald-700 underline">
          Ouvrir la page Démo
        </Link>
      </div>
    );
  }
  const initialMenu = getMenuForRestaurant(user.merchantId);
  return <MerchantMenuClient restaurantId={user.merchantId} initialMenu={initialMenu} />;
}

