import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { settleRiderPayout } from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";

const bodySchema = z.object({
  action: z.enum(["pay", "reject"]),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id } = await context.params;
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  const payout = await settleRiderPayout(id, parsed.data.action);
  if (!payout) return NextResponse.json({ ok: false, error: "conflict", reason: "not_open" }, { status: 409 });
  return NextResponse.json({ ok: true, payout });
}
