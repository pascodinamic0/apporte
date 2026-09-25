import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { listOrdersForCustomer } from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatPriceUSD, statusLabelFr } from "@/src/lib/utils";
import { getRestaurant } from "@/src/lib/data/db";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const orders = user ? await listOrdersForCustomer(user.id) : [];
  const restIds = Array.from(new Set(orders.map((o) => o.restaurantId).filter(Boolean))) as string[];
  const restMap = new Map<string, any>();
  await Promise.all(
    restIds.map(async (id) => {
      const r = await getRestaurant(id);
      if (r) restMap.set(id, r);
    }),
  );
  if (!user) {
    return (
      <div className="py-6">
        <div className="text-lg mb-2">Connecte-toi d’abord.</div>
        <Link href="/demo">
          <Button>Ouvrir la page Démo</Button>
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
              <div className="flex items-center gap-2">#{o.id.slice(-6)}</div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{statusLabelFr(o.status)}</div>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 flex items-center justify-between">
              <div>{new Date(o.createdAt).toLocaleString("fr-CD", { timeZone: "Africa/Kinshasa", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              <div className="font-medium text-emerald-800">{formatPriceUSD(o.totalUsd)}</div>
              <Link href={`/order/${o.id}`}><Button variant="secondary" size="sm">Détails</Button></Link>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <EmptyState
            imageSrc="/images/empty-orders.png"
            title="Aucune commande"
            message="Découvre nos restaurants et Trouvailles."
            primary={{ href: "/food", label: "Parcourir la nourriture" }}
            secondary={{ href: "/smart-finds", label: "Voir les Trouvailles" }}
          />
        )}
      </div>
    </div>
  );
}

