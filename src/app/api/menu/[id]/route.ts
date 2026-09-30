import { NextRequest, NextResponse } from "next/server";
import { toggleMenuItemAvailability, updateMenuItemPrice } from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import { archiveMenuItem, getMenuItemRow, updateMenuItem } from "@/src/lib/data/ops";
import { menuItemUpdateSchema, parseMenuPrice } from "@/src/lib/validation";

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function authorize(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const isAdmin = user.role === "admin";
  const isMerchant = user.role === "merchant" && !!user.merchantId;
  if (!isAdmin && !isMerchant) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const row = await getMenuItemRow(id);
  if (!row || row.archived) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  // A merchant may only edit items of their own restaurant
  if (!isAdmin && row.restaurant_id !== user.merchantId) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user, row };
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "bad_request", reason: "invalid_body" }, { status: 400 });
  }
  const body = { ...(raw as Record<string, unknown>) };
  // Price accepts "7,5" style strings from the quick editor
  if (body.priceUsd !== undefined) {
    const price = parseMenuPrice(body.priceUsd);
    if (price === null) return NextResponse.json({ error: "bad_request", reason: "invalid_price" }, { status: 400 });
    body.priceUsd = price;
  }
  const parsed = menuItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "body");
    return NextResponse.json({ error: "bad_request", reason: `invalid_${field}` }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "bad_request", reason: "nothing_to_update" }, { status: 400 });
  }
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;
  const d = parsed.data;
  if (!supabaseConfigured()) {
    if (typeof d.available === "boolean") await toggleMenuItemAvailability(id, d.available);
    if (d.priceUsd !== undefined) await updateMenuItemPrice(id, d.priceUsd);
    return NextResponse.json({ ok: true, priceUsd: d.priceUsd, available: d.available });
  }
  const item = await updateMenuItem(id, d);
  return NextResponse.json({ ok: true, item, priceUsd: item.priceUsd, available: item.available });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;
  if (!supabaseConfigured()) return NextResponse.json({ error: "unsupported" }, { status: 501 });
  await archiveMenuItem(id);
  return NextResponse.json({ ok: true });
}
