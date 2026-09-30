import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { getFeeSettings, listZones } from "@/src/lib/data/settings";
import { FeesForm } from "./FeesForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Réglages" };

export default async function Page() {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const [fees, zones] = await Promise.all([getFeeSettings(), listZones()]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Réglages</h1>
      <p className="mb-4 text-sm text-gray-600">Ces valeurs remplacent les anciens frais fixes. Les nouvelles commandes les utilisent tout de suite.</p>
      <FeesForm initialFees={fees} initialZones={zones} />
    </div>
  );
}
