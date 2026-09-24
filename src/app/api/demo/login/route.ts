import { NextRequest, NextResponse } from "next/server";
import { getDemoUsers } from "@/src/lib/data/db";

export async function POST(req: NextRequest) {
  const { userId, email } = await req.json().catch(() => ({}));
  const users = await getDemoUsers();
  const user =
    users.find((u) => u.id === userId) ||
    (email ? users.find((u) => u.email === email) : undefined);
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set("demo_user_id", user.id, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

