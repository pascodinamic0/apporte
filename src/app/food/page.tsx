import Link from "next/link";
import { getRestaurants } from "@/src/lib/data/memory";
import { Restaurant } from "@/src/lib/types";
import { RestaurantGrid } from "./parts";

export const dynamic = "force-dynamic";

export default function FoodPage() {
  const restaurants = getRestaurants();
  const cuisines = Array.from(new Set(restaurants.map((r) => r.cuisine))).sort();
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Restaurants</h1>
      <RestaurantGrid restaurants={restaurants as Restaurant[]} cuisines={cuisines} />
    </div>
  );
}

