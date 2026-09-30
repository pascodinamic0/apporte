import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { pushToUsers } from "@/src/lib/push";

/** Sends a test notification to the signed-in user's own devices. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sent = await pushToUsers([user.id], {
    title: "Apporte",
    body: "Les notifications sont activées sur cet appareil.",
    url: "/account",
    tag: "test",
  });
  return NextResponse.json({ ok: true, sent });
}
