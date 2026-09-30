import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/src/lib/auth";
import { getRestaurant } from "@/src/lib/data/db";
import { AccessRequired } from "@/src/components/AccessRequired";
import { HoursClient } from "./HoursClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Horaires et ouverture" };

export default async function MerchantHours() {
  const user = await requireRole(["merchant"]);
  if (!user || !user.merchantId) return <AccessRequired role="commerçant" />;
  const rest = await getRestaurant(user.merchantId);
  if (!rest) return <AccessRequired role="commerçant" />;
  return (
    <div className="py-2">
      <Link href="/merchant" className="mb-3 inline-flex items-center gap-1 text-sm font-medium"><ArrowLeft className="h-4 w-4" aria-hidden /> Commandes</Link>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Horaires et ouverture</h1>
      <p className="mb-5 text-sm text-gray-600">{rest.name}</p>
      <HoursClient restaurant={rest} />
    </div>
  );
}
