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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const riderId = searchParams.get("riderId") || "";
  if (!riderId) return NextResponse.json({ offer: null });
  const offer = await nextOfferForRider(riderId);
  return NextResponse.json({ offer });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, riderId, orderId, pin } = body as {
    action:
      | "accept"
      | "decline"
      | "going"
      | "arrived"
      | "picked_up"
      | "delivering"
      | "delivered";
    riderId: string;
    orderId: string;
    pin?: string;
  };
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

