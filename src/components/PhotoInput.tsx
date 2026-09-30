"use client";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { SafeImage } from "./SafeImage";
import { cn } from "@/src/lib/utils";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Photo picker that uploads to Supabase Storage through /api/uploads. */
export function PhotoInput({
  value,
  onChange,
  label = "Photo",
  aspect = "aspect-[4/3]",
  testId = "photo-input",
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: string;
  testId?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Format accepté : JPG, PNG ou WebP.");
    if (file.size > MAX) return setError("Photo trop lourde (4 Mo maximum).");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.reason === "too_large" ? "Photo trop lourde (4 Mo maximum)." : data.reason === "bad_type" ? "Ce fichier n’est pas une image valide." : "Envoi impossible. Réessaie.",
        );
        return;
      }
      onChange(data.url);
      toast.success("Photo envoyée");
    } catch {
      setError("Connexion perdue. Réessaie.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div data-testid={testId}>
      <span className="mb-1.5 block text-sm font-medium text-gray-800">{label}</span>
      <div className={cn("relative overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50", aspect)}>
        {value ? (
          <SafeImage src={value} alt="Aperçu" fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-700">
            <ImagePlus className="h-8 w-8" aria-hidden />
            <span className="text-sm font-medium">Ajouter une photo</span>
            <span className="text-xs">JPG, PNG ou WebP · 4 Mo max</span>
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" aria-label="Envoi en cours" />
          </div>
        )}
        {value && !busy && (
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className="h-9 rounded-full bg-white/95 px-3 text-sm font-medium text-gray-900 shadow">Changer</button>
            <button type="button" onClick={() => onChange(null)} aria-label="Retirer la photo" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 shadow">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      {error && <p role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
