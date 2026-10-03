"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function SettleButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "pay" | "reject") {
    setBusy(true);
    const r = await fetch(`/api/rider/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) {
      toast.error("Ce retrait n’est plus en attente.");
      router.refresh();
      return;
    }
    toast.success(action === "pay" ? "Versement marqué." : "Demande refusée.");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={() => act("pay")} className="h-9 rounded-full bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
        Marquer versé
      </button>
      <button type="button" disabled={busy} onClick={() => act("reject")} className="h-9 rounded-full border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 disabled:opacity-50">
        Refuser
      </button>
    </div>
  );
}
