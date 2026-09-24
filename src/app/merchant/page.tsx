import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import {
  getRestaurant,
  listOrdersForRestaurant,
  merchantAccept,
  merchantSetPreparing,
  merchantSetReady,
} from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { formatPriceUSD } from "@/src/lib/utils";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function MerchantHome() {
  const user = await requireRole(["merchant"]);
  if (!user) {
    return (
      <div className="py-6">
        <div className="text-lg">Accès commerçant requis.</div>
        <Link href="/demo" className="text-emerald-700 underline">
          Ouvrir la page Démo
        </Link>
      </div>
    );
  }
  const rid = user.merchantId!;
  const rest = (await getRestaurant(rid))!;
  // Read orders directly from in-process data layer to avoid self-fetch issues on Vercel
  const orders = await listOrdersForRestaurant(rid);
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-xl font-semibold">{rest.name} — Commandes</h1>
        <div className="text-sm flex gap-3">
          <Link href="/merchant/menu" className="text-emerald-700 underline">
            Gérer le menu
          </Link>
          <Link href="/merchant/stats" className="text-emerald-700 underline">
            Stats
          </Link>
        </div>
      </div>
      <div className="grid gap-3">
        {orders.length === 0 && <div className="text-gray-600">Aucune commande.</div>}
        {orders.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <div className="font-medium">Commande #{o.id.slice(-6)}</div>
                <div className="text-sm text-gray-600">
                  {o.items.length} article(s) • {formatPriceUSD(o.totalUsd)} • {o.zone}
                </div>
              </div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1 capitalize">
                {o.status}
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              {o.status === "placed" && (
                <ActionButton id={o.id} action="merchant_accept">
                  Accepter
                </ActionButton>
              )}
              {o.status === "restaurant_accepted" && (
                <ActionButton id={o.id} action="merchant_preparing">
                  En préparation
                </ActionButton>
              )}
              {o.status === "preparing" && (
                <ActionButton id={o.id} action="merchant_ready">
                  Prêt (chercher livreur)
                </ActionButton>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function update(id: string, action: string) {
  "use server";
  switch (action) {
    case "merchant_accept":
      await merchantAccept(id);
      break;
    case "merchant_preparing":
      await merchantSetPreparing(id);
      break;
    case "merchant_ready":
      await merchantSetReady(id);
      break;
    default:
      break;
  }
  // Ensure the page reflects the latest state
  revalidatePath("/merchant");
}

function ActionButton({
  id,
  action,
  children,
}: {
  id: string;
  action: string;
  children: React.ReactNode;
}) {
  const act = update.bind(null, id, action);
  return (
    <form action={act}>
      <Button type="submit" size="sm">
        {children}
      </Button>
    </form>
  );
}

