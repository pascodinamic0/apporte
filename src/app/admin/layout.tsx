import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";

export const metadata: Metadata = { title: { template: "%s · Admin · Apporte", default: "Admin · Apporte" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  return (
    <div className="py-2">
      {children}
    </div>
  );
}
