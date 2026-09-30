import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { listAddresses, saveAddress } from "@/src/lib/data/ops";
import { addressSchema, parsePin } from "@/src/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ addresses: await listAddresses(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = addressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "body");
    return NextResponse.json({ error: "bad_request", reason: `invalid_${field}` }, { status: 400 });
  }
  const d = parsed.data;
  let pin: { lat: number; lng: number } | null = null;
  if (d.lat != null || d.lng != null) {
    pin = parsePin(d.lat, d.lng);
    if (!pin) return NextResponse.json({ error: "bad_request", reason: "invalid_pin" }, { status: 400 });
  }
  try {
    const address = await saveAddress(user.id, {
      id: d.id,
      label: d.label,
      address: d.address,
      notes: d.notes || undefined,
      zone: d.zone,
      lat: pin?.lat,
      lng: pin?.lng,
      isDefault: d.isDefault,
    });
    return NextResponse.json({ ok: true, address }, { status: d.id ? 200 : 201 });
  } catch (e: any) {
    if (e?.message === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (e?.message === "too_many_addresses") return NextResponse.json({ error: "conflict", reason: "too_many_addresses" }, { status: 409 });
    throw e;
  }
}
