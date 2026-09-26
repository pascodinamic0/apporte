import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { getRiderState } from "@/src/lib/data/db";
import { RiderClient } from "./RiderClient";
import { AccessRequired } from "@/src/components/AccessRequired";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace livreur" };

export default async function RiderHome() {
  const user = await requireRole(["rider"]);
  if (!user || !user.riderId) return <AccessRequired role="livreur" />;
  const initial = await getRiderState(user.riderId);
  return <RiderClient initial={initial} />;
}
