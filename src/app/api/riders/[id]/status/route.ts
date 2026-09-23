import { NextRequest, NextResponse } from "next/server";
import { setRiderStatus } from "@/src/lib/data/memory";
import type { RiderStatus } from "@/src/lib/types";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { status } = (await req.json().catch(() => ({}))) as {
    status: RiderStatus;
  };
  if (!status) return NextResponse.json({ ok: false }, { status: 400 });
  const { id } = await context.params;
  setRiderStatus(id, status);
  return NextResponse.json({ ok: true });
}

