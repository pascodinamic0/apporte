"use client";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/src/lib/types";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

export function MerchantMenuClient({
  restaurantId,
  initialMenu,
}: {
  restaurantId: string;
  initialMenu: MenuItem[];
}) {
  const [menu, setMenu] = useState<MenuItem[]>(initialMenu);

  useEffect(() => {
    setMenu(initialMenu);
  }, [initialMenu, restaurantId]);

  async function toggleAvailability(mi: MenuItem): Promise<void> {
    await fetch(`/api/menu/${mi.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !mi.available }),
    });
    setMenu((currentMenu) =>
      currentMenu.map((item) =>
        item.id === mi.id ? { ...item, available: !item.available } : item
      )
    );
  }

  async function updatePrice(mi: MenuItem, priceUsd: number): Promise<void> {
    await fetch(`/api/menu/${mi.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceUsd }),
    });
    setMenu((currentMenu) =>
      currentMenu.map((item) =>
        item.id === mi.id ? { ...item, priceUsd } : item
      )
    );
  }

  // As a pragmatic fallback for demo, allow manual refresh by reloading the page
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Menu</h1>
      <div className="grid gap-3">
        {menu.length === 0 && (
          <div className="text-gray-600">Chargement du menu…</div>
        )}
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

