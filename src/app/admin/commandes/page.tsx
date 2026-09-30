import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { AdminConsole } from "./Console";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes" };

export default async function AdminOrdersPage() {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  return <AdminConsole />;
}
