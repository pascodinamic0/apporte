import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { createMenuItem, listMenuForMerchant } from "@/src/lib/data/ops";
import { menuItemCreateSchema, parseMenuPrice } from "@/src/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "merchant" || !user.merchantId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ items: await listMenuForMerchant(user.merchantId) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "merchant" || !user.merchantId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "bad_request", reason: "invalid_body" }, { status: 400 });
  const body = { ...(raw as Record<string, unknown>) };
  const price = parseMenuPrice(body.priceUsd);
  if (price === null) return NextResponse.json({ error: "bad_request", reason: "invalid_price" }, { status: 400 });
  body.priceUsd = price;
  const parsed = menuItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "body");
    return NextResponse.json({ error: "bad_request", reason: `invalid_${field}` }, { status: 400 });
  }
  try {
    const item = await createMenuItem(user.merchantId, parsed.data);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e: any) {
    if (e?.message === "supabase_required") return NextResponse.json({ error: "unsupported" }, { status: 501 });
    throw e;
  }
}
