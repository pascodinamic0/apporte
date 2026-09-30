import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { listRestaurantsAdmin } from "@/src/lib/data/ops";
import { ManageRestaurants } from "./Manage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Restaurants" };

export default async function Page() {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  const restaurants = await listRestaurantsAdmin();
  return <ManageRestaurants restaurants={restaurants} />;
}
