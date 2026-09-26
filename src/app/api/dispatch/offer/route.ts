import { NextRequest, NextResponse } from "next/server";
import {
  acceptOffer,
  declineOffer,
  getOrder,
  nextOfferForRider,
  progressToArrived,
  progressToDelivering,
  progressToGoing,
  confirmPickup,
  confirmDelivered,
} from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";
import { dispatchPostSchema } from "@/src/lib/validation";
import { RIDER_STEP_FROM } from "@/src/lib/orderGuard";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "rider" || !user.riderId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const offer = await nextOfferForRider(user.riderId);
  return NextResponse.json({ offer });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "rider" || !user.riderId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const raw = await req.json().catch(() => null);
  const parsed = dispatchPostSchema.safeParse(raw);
  if (!parsed.success) {
    const pinIssue = parsed.error.issues.some((i) => i.path[0] === "pin");
    return NextResponse.json(
      { ok: false, error: "bad_request", reason: pinIssue ? "bad_pin_format" : "invalid_body" },
      { status: 400 },
    );
  }
  const { action, orderId, pin } = parsed.data;
  const riderId = user.riderId;
  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (action === "accept" || action === "decline") {
    if (order.status !== "rider_searching") {
      return NextResponse.json({ ok: false, error: "conflict", reason: "offer_gone" }, { status: 409 });
    }
    if (action === "decline") {
      await declineOffer(riderId, orderId);
      return NextResponse.json({ ok: true });
    }
    const ok = await acceptOffer(riderId, orderId);
    if (!ok) return NextResponse.json({ ok: false, error: "conflict", reason: "offer_gone" }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  // Step actions: only the assigned rider, only from the expected status
  if (order.riderId !== riderId) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (order.status !== RIDER_STEP_FROM[action]) {
    return NextResponse.json(
      { ok: false, error: "conflict", reason: "invalid_state", status: order.status },
      { status: 409 },
    );
  }
  let ok = false;
  let delivered = null as null | { ok: boolean; reason?: string };
  switch (action) {
    case "going":
      ok = await progressToGoing(riderId, orderId);
      break;
    case "arrived":
      ok = await progressToArrived(riderId, orderId);
      break;
    case "picked_up":
      ok = await confirmPickup(riderId, orderId);
      break;
    case "delivering":
      ok = await progressToDelivering(riderId, orderId);
      break;
    case "delivered":
      if (!pin) {
        return NextResponse.json({ ok: false, error: "bad_request", reason: "bad_pin_format" }, { status: 400 });
      }
      delivered = await confirmDelivered(riderId, orderId, pin);
      ok = delivered.ok;
      break;
  }
  return NextResponse.json({ ok, delivered });
}
