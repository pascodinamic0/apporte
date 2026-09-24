import { listRiders, getRestaurants, getDemoUsers, listOrdersAll } from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { requireRole } from "@/src/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireRole(["admin"]);
  if (!user) {
    return (
      <div className="py-6">
        <div className="text-lg">Accès admin requis.</div>
        <Link href="/demo" className="text-emerald-700 underline">
          Ouvrir la page Démo
        </Link>
      </div>
    );
  }
  // Read recent orders directly from in-process data layer
  const orders = await listOrdersAll();
  const riders = await listRiders();
  const merchants = await getRestaurants();
  const customers = (await getDemoUsers()).filter((u) => u.role === "customer");
  const today = new Date();
  const sod = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const completedToday = orders.filter((o) => o.status === "delivered" && o.createdAt >= sod).length;
  const cancelledToday = orders.filter((o) => o.status === "cancelled" && o.createdAt >= sod).length;
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat title="Commandes terminées (aujourd’hui)" value={String(completedToday)} />
        <Stat title="Annulations (aujourd’hui)" value={String(cancelledToday)} />
        <Stat title="Livreurs en ligne" value={String(riders.filter((r) => r.status === "online").length)} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ListCard title="Commandes récentes">
          {orders.slice(0, 8).map((o) => (
            <Link key={o.id} href={`/order/${o.id}`} className="flex items-center justify-between text-sm hover:underline">
              <div className="truncate">
                #{o.id.slice(-6)} • {o.zone} • {o.items.length} items
              </div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1 capitalize">{o.status}</div>
            </Link>
          ))}
        </ListCard>
        <ListCard title="Livreurs">
          {riders.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <div>{r.name}</div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{r.status}</div>
            </div>
          ))}
        </ListCard>
        <ListCard title="Commerçants">
          {merchants.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <div>{m.name}</div>
              <div className="text-xs text-gray-600">{m.cuisine}</div>
            </div>
          ))}
        </ListCard>
        <ListCard title="Clients">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div>{c.name}</div>
              <div className="text-xs text-gray-600">{c.email}</div>
            </div>
          ))}
        </ListCard>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="text-sm text-gray-600">{title}</CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="font-medium">{title}</CardHeader>
      <CardContent className="grid gap-2">{children}</CardContent>
    </Card>
  );
}

