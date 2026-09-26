import { NextRequest, NextResponse } from "next/server";
import { getRiderState, setRiderStatus } from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import { riderStatusSchema } from "@/src/lib/validation";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (user.role !== "rider" || !user.riderId || user.riderId !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = riderStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", reason: "invalid_status" }, { status: 400 });
  }
  const state = await getRiderState(user.riderId);
  if (state.activeOrder) {
    // "Occupé" is derived from the active delivery; finish it first.
    return NextResponse.json({ error: "conflict", reason: "active_delivery", status: "busy" }, { status: 409 });
  }
  await setRiderStatus(user.riderId, parsed.data.status);
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
