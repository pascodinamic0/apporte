import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { listOrdersForCustomer } from "@/src/lib/data/db";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatPriceUSD, statusLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const orders = user ? await listOrdersForCustomer(user.id) : [];
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-2">Compte</h1>
      {user ? (
        <Card>
          <CardHeader className="font-medium">{user.name}</CardHeader>
          <CardContent className="text-sm text-gray-700">
            <div>Email: {user.email}</div>
            <div>Rôle: {user.role}</div>
            <div className="mt-2">
              <Link href="/orders" className="text-emerald-700 underline">
                Voir mes commandes
              </Link>
              <span className="mx-2">•</span>
              <Link href="/credits" className="text-emerald-700 underline">
                À propos / Crédits photos
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-sm">
          Non connecté — ouvre{" "}
          <Link href="/demo" className="text-emerald-700 underline">
            Comptes Démo
          </Link>{" "}
          pour te connecter.
        </div>
      )}
      {user && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Dernières commandes</h2>
          <div className="grid gap-3">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardHeader className="flex items-center justify-between">
                  <div>#{o.id.slice(-6)}</div>
                  <div className="text-xs rounded-full bg-gray-100 px-2 py-1">{statusLabelFr(o.status)}</div>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 flex items-center justify-between">
                  <div>{new Date(o.createdAt).toLocaleString("fr-CD", { timeZone: "Africa/Kinshasa", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="font-medium text-emerald-800">{formatPriceUSD(o.totalUsd)}</div>
                  <Link href={`/order/${o.id}`} className="text-emerald-700 underline">
                    Ouvrir
                  </Link>
                </CardContent>
              </Card>
            ))}
            {orders.length === 0 && <div className="text-gray-600">Aucune commande.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

