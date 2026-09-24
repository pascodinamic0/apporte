import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { listOrdersForCustomer } from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatPriceUSD, statusLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const orders = user ? await listOrdersForCustomer(user.id) : [];
  if (!user) {
    return (
      <div className="py-6">
        <div className="text-lg">Connecte-toi d’abord.</div>
        <Link href="/demo" className="text-emerald-700 underline">
          Ouvrir la page Démo
        </Link>
      </div>
    );
  }
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Mes commandes</h1>
      <div className="grid gap-3">
        {orders.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex items-center justify-between">
              <div>#{o.id.slice(-6)}</div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{statusLabelFr(o.status)}</div>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 flex items-center justify-between">
              <div>{new Date(o.createdAt).toLocaleString()}</div>
              <div className="font-medium text-emerald-800">{formatPriceUSD(o.totalUsd)}</div>
              <Link href={`/order/${o.id}`} className="text-emerald-700 underline">
                Détails
              </Link>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && <div className="text-gray-600">Aucune commande.</div>}
      </div>
    </div>
  );
}

