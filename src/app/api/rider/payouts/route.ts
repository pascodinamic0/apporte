import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRiderPayout } from "@/src/lib/data/db";
import { getCurrentUser } from "@/src/lib/auth";

const bodySchema = z.object({
  phone: z.string().trim().min(1).max(32),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (user.role !== "rider" || !user.riderId) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request", reason: "invalid_phone" }, { status: 400 });
  }
  const result = await createRiderPayout(user.riderId, parsed.data.phone);
  if (!result.ok) {
    const status = result.reason === "invalid_phone" ? 400 : 409;
    return NextResponse.json({ ok: false, error: "bad_request", reason: result.reason }, { status });
  }
  return NextResponse.json({ ok: true, payout: result.payout });
}
