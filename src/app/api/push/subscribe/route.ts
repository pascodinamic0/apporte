import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { deletePushSubscription, savePushSubscription } from "@/src/lib/data/ops";

const subSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "https_only"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = subSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", reason: "invalid_subscription" }, { status: 400 });
  try {
    await savePushSubscription(user.id, {
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: req.headers.get("user-agent") || undefined,
    });
  } catch (e: any) {
    if (e?.message === "supabase_required") return NextResponse.json({ error: "unsupported" }, { status: 501 });
    throw e;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint || typeof body.endpoint !== "string") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  await deletePushSubscription(user.id, body.endpoint);
  return NextResponse.json({ ok: true });
}
