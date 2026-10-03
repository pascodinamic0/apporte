import { NextRequest, NextResponse } from "next/server";
import { getMenuForRestaurant } from "@/src/lib/data/db";

/** Public dish availability so checkout can block a cart before the customer pays. */
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const items = await getMenuForRestaurant(id);
  return NextResponse.json(
    { items: items.map((m) => ({ id: m.id, name: m.name, available: m.available })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
