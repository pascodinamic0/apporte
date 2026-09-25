import { NextRequest, NextResponse } from "next/server";
import { setRiderStatus } from "@/src/lib/data/db";
import type { RiderStatus } from "@/src/lib/types";
import { getCurrentUser } from "@/src/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { status } = (await req.json().catch(() => ({}))) as {
    status: RiderStatus;
  };
  if (!status) return NextResponse.json({ ok: false }, { status: 400 });
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "rider" || !user.riderId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (user.riderId !== id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await setRiderStatus(user.riderId, status);
  return NextResponse.json({ ok: true });
}

