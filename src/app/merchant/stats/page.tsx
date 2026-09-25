import { requireRole } from "@/src/lib/auth";
import { listOrdersForRestaurant } from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MerchantStats() {
  const user = await requireRole(["merchant"]);
  if (!user) return <div className="py-6">Accès commerçant requis.</div>;
  const rid = user.merchantId!;
  const orders = await listOrdersForRestaurant(rid);
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todays = orders.filter((o) => o.createdAt >= startOfDay);
  const sales = todays.reduce((s, o) => s + o.totalUsd, 0);
  const aov = todays.length ? sales / todays.length : 0;
  const byHour: Record<number, number> = {};
  for (const o of todays) {
    const h = new Date(o.createdAt).getHours();
    byHour[h] = (byHour[h] || 0) + o.totalUsd;
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
      <h1 className="text-xl font-semibold mb-3">Statistiques (aujourd’hui)</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Commandes" value={todays.length.toString()} />
        <StatCard title="Ventes" value={`$${sales.toFixed(2)}`} />
        <StatCard title="Panier moyen" value={`$${aov.toFixed(2)}`} />
      </div>
      <Card className="mt-3">
        <CardHeader className="text-sm text-gray-600">Tendance des ventes (par heure)</CardHeader>
        <CardContent>
          <svg width="100%" height="60" viewBox="0 0 140 60" preserveAspectRatio="none">
            <path d={`${path}`} stroke="#047857" strokeWidth="2" fill="none" />
            <line x1="0" y1="40" x2="140" y2="40" stroke="#e5e7eb" />
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="text-sm text-gray-600">{title}</CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

