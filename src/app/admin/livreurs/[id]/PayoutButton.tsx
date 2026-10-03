"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PayoutButton({ orderId, paid }: { orderId: string; paid: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const r = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rider_payout", paid: !paid }),
    }).catch(() => null);
    setBusy(false);
    if (r && r.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="text-xs font-medium text-emerald-800 underline disabled:opacity-50"
    >
      {busy ? "…" : paid ? "Marquer en attente" : "Marquer versé"}
    </button>
  );
}
