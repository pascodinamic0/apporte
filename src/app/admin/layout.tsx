import type { Metadata } from "next";
import { requireRole } from "@/src/lib/auth";
import { AccessRequired } from "@/src/components/AccessRequired";
import { LiveRefresh } from "@/src/components/LiveRefresh";

export const metadata: Metadata = { title: { template: "%s · Admin · Apporte", default: "Admin · Apporte" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"]);
  if (!user) return <AccessRequired role="admin" />;
  return (
    <div className="py-2">
      <div className="mb-3 flex justify-end">
        <LiveRefresh topics={["admin"]} pollMs={15000} fastPollMs={4000} />
      </div>
      {children}
    </div>
  );
}
