import { NextRequest, NextResponse } from "next/server";
import { toggleMenuItemAvailability, updateMenuItemPrice } from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import { getServiceClient } from "@/src/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const isAdmin = user.role === "admin";
  const isMerchant = user.role === "merchant" && !!user.merchantId;
  if (!isAdmin && !isMerchant) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const { available, priceUsd } = body as {
    available?: boolean;
    priceUsd?: number;
  };
  // If merchant, ensure the menu item belongs to their restaurant
  if (!isAdmin && isMerchant) {
    const supabase = getServiceClient();
    const m = await supabase.from("menu_items").select("restaurant_id").eq("id", id).maybeSingle();
    if (m.error || !m.data || m.data.restaurant_id !== user.merchantId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  if (typeof available === "boolean") {
    await toggleMenuItemAvailability(id, available);
  }
  if (typeof priceUsd === "number") {
    await updateMenuItemPrice(id, priceUsd);
  }
  return NextResponse.json({ ok: true });
}

