import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { RiderClient } from "./RiderClient";
import { getCurrentUser } from "@/src/lib/auth";

export default async function RiderHome() {
  const user = await requireRole(["rider"]);
  if (!user) {
    return (
      <div className="py-6">
        <div className="text-lg">Accès livreur requis.</div>
        <Link href="/demo" className="text-emerald-700 underline">
          Ouvrir la page Démo
        </Link>
      </div>
    );
  }
  const riderId = (await getCurrentUser())?.riderId || "rider_1";
  return <RiderClient riderId={riderId} />;
}

