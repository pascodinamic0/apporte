import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Same attributes as the login cookie (path "/"), expired immediately
  res.cookies.set("demo_user_id", "", { path: "/", maxAge: 0, sameSite: "lax", httpOnly: false });
  return res;
}
