import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { getServiceClient } from "@/src/lib/supabase/server";
import { checkUpload, UPLOAD_MAX_BYTES } from "@/src/lib/upload";
import { randomId } from "@/src/lib/utils";

export const runtime = "nodejs";
const BUCKET = "menu-photos";

/** Photo upload for dishes and restaurants (merchant or admin). Returns the public URL. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const isMerchant = user.role === "merchant" && !!user.merchantId;
  if (!isMerchant && user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "unsupported" }, { status: 501 });
  }
  const len = Number(req.headers.get("content-length") || 0);
  if (len > UPLOAD_MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "bad_request", reason: "too_large" }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "bad_request", reason: "missing_file" }, { status: 400 });
  const buf = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(buf.byteLength, file.type, buf.subarray(0, 16));
  if (!check.ok) return NextResponse.json({ error: "bad_request", reason: check.reason }, { status: check.reason === "too_large" ? 413 : 400 });
  const folder = isMerchant ? user.merchantId! : "admin";
  const path = `${folder}/${randomId("img")}.${check.ext}`;
  const supabase = getServiceClient();
  const up = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: check.type, upsert: false, cacheControl: "31536000" });
  if (up.error) {
    console.error("upload failed", up.error.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 502 });
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl, path }, { status: 201 });
}
