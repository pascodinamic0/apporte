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
import { SafeImage } from "@/src/components/SafeImage";
import { Stagger } from "@/src/components/Stagger";
import { Button } from "@/src/components/ui/button";
import { formatPriceUSD, statusLabelFr } from "@/src/lib/utils";
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
      <div className="rounded-xl overflow-hidden mb-2">
        <SafeImage src={rest.imageUrl} alt={rest.name} width={1200} height={320} className="h-20 w-full object-cover" />
      </div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold">{rest.name}</h1>
        <div className="flex gap-2">
          <Link href="/merchant/menu"><button className="h-9 px-3 rounded-md border text-sm">Gérer le menu</button></Link>
          <Link href="/merchant/stats"><button className="h-9 px-3 rounded-md border text-sm">Stats</button></Link>
        </div>
      </div>
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {[
          { key: "new", label: "Nouvelles" },
          { key: "preparing", label: "En préparation" },
          { key: "ready", label: "Prêtes" },
        ].map((t) => (
          <form key={t.key} action={async () => { "use server"; }}>
            <button type="button" className="rounded-full border px-3 py-1 text-sm whitespace-nowrap bg-white border-gray-200 text-gray-700">
              {t.label}
            </button>
          </form>
        ))}
      </div>
      <div className="grid gap-3">
        {orders.length === 0 && (
          <div className="text-gray-600 flex flex-col items-center justify-center py-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/apporte.svg" alt="" className="h-12 w-12 mb-2" />
            Aucune commande.
          </div>
        )}
        <Stagger>
        {orders.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <div className="font-medium">Commande #{o.id.slice(-6)}</div>
                <div className="text-sm text-gray-600">
                  {o.items.length} article(s) • {formatPriceUSD(o.totalUsd)} • {o.zone}
                </div>
              </div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1">
                {statusLabelFr(o.status)}
              </div>
            </CardHeader>
            <CardContent className="flex gap-3 items-center">
              <SafeImage
                src={o.items[0]?.imageUrl || rest.imageUrl}
                alt={o.items[0]?.name || rest.name}
                width={96}
                height={64}
                className="h-16 w-24 rounded-md object-cover"
              />
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
        </Stagger>
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

