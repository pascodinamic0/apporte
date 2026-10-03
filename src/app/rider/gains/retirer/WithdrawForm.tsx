"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/src/components/ui/button";
import { mobileMoneyProvider } from "@/src/lib/payouts";
import { formatPriceUSD } from "@/src/lib/utils";

export function WithdrawForm({ amountUsd, defaultPhone }: { amountUsd: number; defaultPhone: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const network = useMemo(() => mobileMoneyProvider(phone), [phone]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!network) {
      setError("Indique un numéro Mobile Money congolais.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/rider/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.reason === "nothing_to_withdraw" ? "Ce solde a déjà été demandé." : "Ce numéro n’est pas un Mobile Money congolais.");
        return;
      }
      toast.success("Demande de retrait envoyée.");
      router.push("/rider/gains");
      router.refresh();
    } catch {
      setError("La demande n’est pas partie. Vérifie ta connexion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <div className="rounded-2xl bg-emerald-50 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Montant</div>
        <div className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-950">{formatPriceUSD(amountUsd)}</div>
        <p className="mt-1 text-sm text-emerald-800">Toutes les courses encore en attente.</p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="payout-phone" className="text-sm font-medium">
          Numéro Mobile Money
        </label>
        <input
          id="payout-phone"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          className="h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base outline-none focus:border-emerald-700"
          placeholder="081 234 5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-sm text-gray-600">{network ? network.label : "Vodacom, Airtel, Orange ou Africell."}</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy || !network} className="h-12 rounded-xl">
        {busy ? "Envoi…" : `Retirer ${formatPriceUSD(amountUsd)}`}
      </Button>
      <p className="text-xs text-gray-500">
        L’équipe Apporte envoie ce montant sur ce numéro, puis marque les courses comme versées.
      </p>
    </form>
  );
}
