/** Image upload validation (pure). */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const UPLOAD_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

/** Detect the real type from the first bytes; never trust the declared type alone. */
export function sniffImageType(b: Uint8Array): keyof typeof UPLOAD_TYPES | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export function checkUpload(size: number, declared: string, head: Uint8Array):
  | { ok: true; type: keyof typeof UPLOAD_TYPES; ext: string }
  | { ok: false; reason: "empty" | "too_large" | "bad_type" } {
  if (size <= 0) return { ok: false, reason: "empty" };
  if (size > UPLOAD_MAX_BYTES) return { ok: false, reason: "too_large" };
  const sniffed = sniffImageType(head);
  if (!sniffed || !(declared in UPLOAD_TYPES)) return { ok: false, reason: "bad_type" };
  return { ok: true, type: sniffed, ext: UPLOAD_TYPES[sniffed] };
}
