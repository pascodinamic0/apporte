import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { getRestaurants, listSmartFinds } from "@/src/lib/data/db";
import { Utensils, Package, ShoppingCart } from "lucide-react";
import { getCurrentUser } from "@/src/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (user && user.role !== "customer") {
    if (user.role === "merchant") redirect("/merchant");
    if (user.role === "rider") redirect("/rider");
    if (user.role === "admin") redirect("/admin");
  }
  const restaurants = (await getRestaurants()).slice(0, 4);
  const products = (await listSmartFinds()).slice(0, 3);
  return (
    <div className="py-6">
      <section className="rounded-xl brand-gradient p-5 shadow-sm">
        <div className="text-sm text-emerald-800 font-semibold">Kinshasa — Gombe</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          On te l’apporte
        </h1>
        <p className="mt-1 text-gray-700">
          Restaurants, gadgets et petits besoins. Commande en quelques taps.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/food">
            <Button className="gap-2">
              <Utensils className="h-4 w-4" />
              Découvrir à manger
            </Button>
          </Link>
          <Link href="/smart-finds">
            <Button variant="outline" className="gap-2">
              <Package className="h-4 w-4" />
              Trouvailles
            </Button>
          </Link>
          <Link href="/cart" className="hidden sm:block">
            <Button variant="outline" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Panier
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Restaurants à la une</h2>
          <Link href="/food" className="text-sm text-emerald-700 underline">
            Voir tout
          </Link>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {restaurants.map((r) => (
            <Link href={`/restaurant/${r.id}`} key={r.id}>
              <Card className="hover:shadow transition-shadow">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-gray-600">{r.cuisine}</div>
                  </div>
                  <div className="text-xs rounded-full bg-emerald-50 text-emerald-800 px-2 py-1">
                    {r.etaMinutes} min • {r.rating.toFixed(1)}★
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-28 w-full rounded-lg brand-gradient flex items-center justify-center text-3xl">
                    🍽️
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Smart Finds</h2>
          <Link href="/smart-finds" className="text-sm text-emerald-700 underline">
            Tout voir
          </Link>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="hover:shadow transition-shadow">
              <CardHeader className="font-medium">{p.name}</CardHeader>
              <CardContent>
                <div className="h-20 w-full rounded-lg brand-gradient flex items-center justify-center text-2xl">
                  📦
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
