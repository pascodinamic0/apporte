import { listRiders, getRestaurants, getDemoUsers, listOrdersAll } from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { statusLabelFr } from "@/src/lib/utils";
import { SafeImage } from "@/src/components/SafeImage";
import { Stagger } from "@/src/components/Stagger";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireRole(["admin"]);
  if (!user) {
    return (
      <div className="py-6">
        <div className="text-lg">Accès admin requis.</div>
        <Link href="/demo"><button className="inline-flex h-11 px-4 rounded-md bg-emerald-700 text-white">Ouvrir la page Démo</button></Link>
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
  // Sparkline for orders per hour
  const byHour: Record<number, number> = {};
  const today2 = new Date();
  const sod2 = new Date(today2.getFullYear(), today2.getMonth(), today2.getDate()).getTime();
  for (const o of orders.filter((o) => o.createdAt >= sod2)) {
    const h = new Date(o.createdAt).getHours();
    byHour[h] = (byHour[h] || 0) + 1;
  }
  const points = Array.from({ length: 24 }, (_, h) => byHour[h] || 0);
  const max = Math.max(1, ...points);
  const path = points
    .map((v, i) => {
      const x = (i / 23) * 140;
      const y = 40 - (v / max) * 40;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Admin</h1>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Stat title="Commandes terminées (aujourd’hui)" value={String(completedToday)} />
        <Stat title="Annulations (aujourd’hui)" value={String(cancelledToday)} />
        <Stat title="Livreurs en ligne" value={String(riders.filter((r) => r.status === "online").length)} />
      </div>
      <Card className="mt-3">
        <CardHeader className="text-sm text-gray-600">Tendance des commandes (par heure)</CardHeader>
        <CardContent>
          <svg width="100%" height="60" viewBox="0 0 140 60" preserveAspectRatio="none">
            <path d={`${path}`} stroke="#047857" strokeWidth="2" fill="none" />
            <line x1="0" y1="40" x2="140" y2="40" stroke="#e5e7eb" />
          </svg>
        </CardContent>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ListCard title="Commandes récentes">
          <Stagger>
          {orders.slice(0, 8).map((o) => (
            <Link key={o.id} href={`/order/${o.id}`} className="flex items-center justify-between text-sm">
              <div className="truncate">
                #{o.id.slice(-6)} • {o.zone} • {o.items.length} article{ o.items.length>1 ? "s" : "" }
              </div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{statusLabelFr(o.status)}</div>
            </Link>
          ))}
          </Stagger>
        </ListCard>
        <ListCard title="Livreurs">
          <Stagger>
          {riders.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <div>{r.name}</div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{r.status}</div>
            </div>
          ))}
          </Stagger>
        </ListCard>
        <ListCard title="Commerçants">
          <Stagger>
          {merchants.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <SafeImage src={m.imageUrl} alt={m.name} width={32} height={20} className="h-8 w-12 rounded object-cover" />
                <div>{m.name}</div>
              </div>
              <div className="text-xs text-gray-600">{m.cuisine}</div>
            </div>
          ))}
          </Stagger>
        </ListCard>
        <ListCard title="Clients">
          <Stagger>
          {customers.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div>{c.name}</div>
              <div className="text-xs text-gray-600">{c.email}</div>
            </div>
          ))}
          </Stagger>
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

