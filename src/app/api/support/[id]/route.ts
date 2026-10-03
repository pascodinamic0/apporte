import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { setSupportRequestStatus } from "@/src/lib/data/db";
import { supportStatusSchema } from "@/src/lib/validation";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = supportStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", reason: "invalid_body" }, { status: 400 });
  const { id } = await context.params;
  const row = await setSupportRequestStatus(id, parsed.data.status);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, request: row });
}
