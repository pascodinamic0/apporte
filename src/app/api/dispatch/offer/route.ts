import { NextRequest, NextResponse } from "next/server";
import {
  acceptOffer,
  declineOffer,
  nextOfferForRider,
  progressToArrived,
  progressToDelivering,
  progressToGoing,
  confirmPickup,
  confirmDelivered,
} from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "rider" || !user.riderId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const offer = await nextOfferForRider(user.riderId);
  return NextResponse.json({ offer });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, orderId, pin } = body as {
    action:
      | "accept"
      | "decline"
      | "going"
      | "arrived"
      | "picked_up"
      | "delivering"
      | "delivered";
    orderId: string;
    pin?: string;
  };
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "rider" || !user.riderId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const riderId = user.riderId;
  let ok = false;
  let delivered = null as null | { ok: boolean; reason?: string };
  switch (action) {
    case "accept":
      ok = await acceptOffer(riderId, orderId);
      break;
    case "decline":
      await declineOffer(riderId, orderId);
      ok = true;
      break;
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
      delivered = await confirmDelivered(riderId, orderId, pin || "");
      ok = delivered.ok;
      break;
  }
  return NextResponse.json({ ok, delivered });
}

