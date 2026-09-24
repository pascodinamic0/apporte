import { NextRequest, NextResponse } from "next/server";
import {
  addSupportNote,
  getOrder,
  merchantAccept,
  merchantSetPreparing,
  merchantSetReady,
  setOrderRating,
  updateOrderStatus,
} from "@/src/lib/data/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const order = await getOrder(id);
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
    await updateOrderStatus(id, status);
  } else if (action === "merchant_accept") {
    await merchantAccept(id);
  } else if (action === "merchant_preparing") {
    await merchantSetPreparing(id);
  } else if (action === "merchant_ready") {
    await merchantSetReady(id);
  } else if (action === "rate" && rating) {
    await setOrderRating(id, rating, comment);
  } else if (action === "support_note" && note && by) {
    await addSupportNote(id, note, by);
  }
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}

