"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupportRequestStatus } from "@/src/lib/types";

const OPTIONS: { value: SupportRequestStatus; label: string }[] = [
  { value: "open", label: "Ouverte" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Résolue" },
];

export function StatusForm({ id, status }: { id: string; status: SupportRequestStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function onChange(next: SupportRequestStatus) {
    const prev = value;
    setValue(next);
    setSaving(true);
    const r = await fetch(`/api/support/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) {
      setValue(prev);
      return;
    }
    router.refresh();
  }

  return (
    <select
      aria-label="Statut de la demande"
      className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm"
      value={value}
      disabled={saving}
      onChange={(e) => onChange(e.target.value as SupportRequestStatus)}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
