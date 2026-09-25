"use client";
import Link from "next/link";
import { SafeImage } from "@/src/components/SafeImage";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import type { Restaurant } from "@/src/lib/types";
import { Stagger } from "@/src/components/Stagger";
import { StarRating } from "@/src/components/StarRating";

export function RestaurantGrid({
  restaurants,
  cuisines,
}: {
  restaurants: Restaurant[];
  cuisines: string[];
}) {
  const [query, setQuery] = useState("");
  const [activeCuisine, setActiveCuisine] = useState<string>("");
  const filtered = useMemo(() => {
    let list = restaurants;
    if (activeCuisine) list = list.filter((r) => r.cuisine === activeCuisine);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [restaurants, query, activeCuisine]);
  return (
    <>
      <div className="flex gap-2 items-center mb-3">
        <Input
          placeholder="Rechercher un restaurant…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 flex-nowrap">
        <button
          onClick={() => setActiveCuisine("")}
          className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
            !activeCuisine ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-gray-200 text-gray-700"
          }`}
        >
          Tout
        </button>
        {cuisines.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCuisine(c)}
            className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
              activeCuisine === c ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mt-2">
        <Stagger>
        {filtered.map((r) => (
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
              <CardContent className="text-sm text-gray-600">
                <SafeImage
                  src={r.imageUrl}
                  alt={r.name}
                  width={640}
                  height={320}
                  className="h-32 w-full rounded-lg object-cover mb-2"
                />
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={
                      r.isOpen
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }
                  >
                    {r.isOpen ? "Ouvert" : "Fermé"}
                  </Badge>
                  <StarRating value={r.rating} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        </Stagger>
        {filtered.length === 0 && (
          <div className="text-gray-600">Aucun restaurant ne correspond à ta recherche.</div>
        )}
      </div>
    </>
  );
}

