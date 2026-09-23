"use client";
import { useEffect, useState } from "react";
import { requireRole } from "@/src/lib/auth";
import { getMenuForRestaurant, getRestaurant } from "@/src/lib/data/memory";
import type { MenuItem } from "@/src/lib/types";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

export default function MerchantMenu() {
  // This page runs on client to enable quick edits
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");

  useEffect(() => {
    // In demo, merchant is bound to KFC Gombe
    setRestaurantId("rest_kfc_gombe");
    // @ts-ignore server import not available client-side; minimal mimic:
    // We'll request via a public API in a full app; for demo preload simple JSON
    const initial =
      (getMenuForRestaurant as any)?.("rest_kfc_gombe") ??
      ([] as MenuItem[]);
    setMenu(initial);
  }, []);

  async function toggleAvailability(mi: MenuItem) {
    await fetch(`/api/menu/${mi.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !mi.available }),
    });
    setMenu((cur) =>
      cur.map((x) => (x.id === mi.id ? { ...x, available: !x.available } : x)),
    );
  }
  async function updatePrice(mi: MenuItem, priceUsd: number) {
    await fetch(`/api/menu/${mi.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceUsd }),
    });
    setMenu((cur) => cur.map((x) => (x.id === mi.id ? { ...x, priceUsd } : x)));
  }

  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Menu</h1>
      <div className="grid gap-3">
        {menu.map((m) => (
          <Card key={m.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-gray-600">{m.description}</div>
              </div>
              <div className="text-sm">
                <label className="mr-2">Prix</label>
                <Input
                  className="w-24 inline-block"
                  type="number"
                  step="0.5"
                  value={m.priceUsd}
                  onChange={(e) => updatePrice(m, parseFloat(e.target.value))}
                />
              </div>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button variant="outline" onClick={() => toggleAvailability(m)}>
                {m.available ? "Marquer indisponible" : "Marquer disponible"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

