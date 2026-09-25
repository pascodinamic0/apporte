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
        <Link href="/demo"><button className="inline-flex h-11 px-4 rounded-md bg-emerald-700 text-white">Ouvrir la page Démo</button></Link>
      </div>
    );
  }
  const riderId = (await getCurrentUser())?.riderId || "rider_1";
  return <RiderClient riderId={riderId} />;
}

