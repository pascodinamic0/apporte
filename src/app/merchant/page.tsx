import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { cookies } from "next/headers";
import { getRestaurant } from "@/src/lib/data/memory";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { formatPriceUSD } from "@/src/lib/utils";

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
  const rest = getRestaurant(rid)!;
  // Fetch orders via API to ensure cross-runtime consistency in demo mode
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://127.0.0.1:${process.env.PORT || 3000}`);
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const res = await fetch(`${base}/api/orders`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  });
  const data = (await res.json()) as { orders: any[] };
  const orders = data.orders ?? [];
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
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
    cache: "no-store",
  });
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

