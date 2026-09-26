import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { getRiderState } from "@/src/lib/data/db";

export const dynamic = "force-dynamic";

/** Current rider status and active delivery, straight from the database. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "rider" || !user.riderId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const state = await getRiderState(user.riderId);
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
