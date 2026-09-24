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
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Statistiques (aujourd’hui)</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Commandes" value={todays.length.toString()} />
        <StatCard title="Ventes" value={`$${sales.toFixed(2)}`} />
        <StatCard title="Panier moyen" value={`$${aov.toFixed(2)}`} />
      </div>
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

