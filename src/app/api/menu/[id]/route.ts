import { NextRequest, NextResponse } from "next/server";
import {
  toggleMenuItemAvailability,
  updateMenuItemPrice,
} from "@/src/lib/data/db";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const { available, priceUsd } = body as {
    available?: boolean;
    priceUsd?: number;
  };
  if (typeof available === "boolean") {
    await toggleMenuItemAvailability(id, available);
  }
  if (typeof priceUsd === "number") {
    await updateMenuItemPrice(id, priceUsd);
  }
  return NextResponse.json({ ok: true });
}

