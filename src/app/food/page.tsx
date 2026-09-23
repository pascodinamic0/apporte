import Link from "next/link";
import { getRestaurants } from "@/src/lib/data/memory";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

export const dynamic = "force-dynamic";

export default function FoodPage() {
  const restaurants = getRestaurants();
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Restaurants</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {restaurants.map((r) => (
          <Link href={`/restaurant/${r.id}`} key={r.id}>
            <Card className="hover:shadow">
              <CardHeader className="flex items-center justify-between">
                <div className="font-medium">{r.name}</div>
                <Badge>{r.cuisine}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-gray-600">
                <div>Temps: {r.etaMinutes} min</div>
                <div>Note: {r.rating.toFixed(1)}★</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

