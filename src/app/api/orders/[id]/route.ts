import { NextRequest, NextResponse } from "next/server";
import {
  addSupportNote,
  getOrder,
  merchantAccept,
  merchantSetPreparing,
  merchantSetReady,
  setOrderRating,
  updateOrderStatus,
} from "@/src/lib/data/memory";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await req.json().catch(() => ({}));
  const { action, status, rating, comment, note, by } = body;
  const { id } = await context.params;
  if (action === "update_status" && status) {
    updateOrderStatus(id, status);
  } else if (action === "merchant_accept") {
    merchantAccept(id);
  } else if (action === "merchant_preparing") {
    merchantSetPreparing(id);
  } else if (action === "merchant_ready") {
    merchantSetReady(id);
  } else if (action === "rate" && rating) {
    setOrderRating(id, rating, comment);
  } else if (action === "support_note" && note && by) {
    addSupportNote(id, note, by);
  }
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}

