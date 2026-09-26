import { NextRequest, NextResponse } from "next/server";
import { toggleMenuItemAvailability, updateMenuItemPrice } from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import { getServiceClient } from "@/src/lib/supabase/server";
import { menuPatchSchema, parseMenuPrice } from "@/src/lib/validation";
import { getMenuForRestaurant } from "@/src/lib/data/db";

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function menuItemRestaurant(id: string, merchantId: string): Promise<string | null> {
  if (!supabaseConfigured()) {
    const menu = await getMenuForRestaurant(merchantId);
    return menu.some((m) => m.id === id) ? merchantId : null;
  }
  const supabase = getServiceClient();
  const m = await supabase.from("menu_items").select("restaurant_id").eq("id", id).maybeSingle();
  if (m.error || !m.data) return null;
  return m.data.restaurant_id as string;
}

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
  const raw = await req.json().catch(() => null);
  const parsed = menuPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", reason: "invalid_body" }, { status: 400 });
  }
  const { available, priceUsd } = parsed.data;
  let price: number | null = null;
  if (priceUsd !== undefined) {
    price = parseMenuPrice(priceUsd);
    if (price === null) {
      return NextResponse.json({ error: "bad_request", reason: "invalid_price" }, { status: 400 });
    }
  }
  if (available === undefined && price === null) {
    return NextResponse.json({ error: "bad_request", reason: "nothing_to_update" }, { status: 400 });
  }
  // A merchant may only edit items of their own restaurant
  if (!isAdmin) {
    const owner = await menuItemRestaurant(id, user.merchantId!);
    if (owner !== user.merchantId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  if (typeof available === "boolean") await toggleMenuItemAvailability(id, available);
  if (price !== null) await updateMenuItemPrice(id, price);
  return NextResponse.json({ ok: true, priceUsd: price ?? undefined, available });
}
