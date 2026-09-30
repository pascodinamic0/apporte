import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { updateRestaurantOpenState } from "@/src/lib/data/ops";
import { validateHours } from "@/src/lib/hours";
import { restaurantOpenSchema } from "@/src/lib/validation";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "merchant" || !user.merchantId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = restaurantOpenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", reason: "invalid_body" }, { status: 400 });
  const patch: Parameters<typeof updateRestaurantOpenState>[1] = {};
  if (parsed.data.acceptingOrders !== undefined) patch.acceptingOrders = parsed.data.acceptingOrders;
  if (parsed.data.hours) {
    const h = validateHours(parsed.data.hours);
    if (!h.ok) return NextResponse.json({ error: "bad_request", reason: h.reason }, { status: 400 });
    patch.hours = h.data;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "bad_request", reason: "nothing_to_update" }, { status: 400 });
  const restaurant = await updateRestaurantOpenState(user.merchantId, patch);
  return NextResponse.json({ ok: true, restaurant });
}
