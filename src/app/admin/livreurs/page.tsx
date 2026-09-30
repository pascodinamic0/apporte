import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { listRiders } from "@/src/lib/data/db";
import { riderEarnings } from "@/src/lib/data/ops";
import { ManageRiders } from "./Manage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Livreurs" };

export default async function Page() {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const riders = await listRiders();
  const earn = await riderEarnings(riders.map((r) => r.id));
  return <ManageRiders riders={riders.map((r) => ({ ...r, earnings: earn[r.id] }))} />;
}
