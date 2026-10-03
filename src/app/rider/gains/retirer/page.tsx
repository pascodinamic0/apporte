import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/src/lib/auth";
import { getRider, listOrdersForRider, listRiderPayouts } from "@/src/lib/data/db";
import { AccessRequired } from "@/src/components/AccessRequired";
import { lockedPayoutOrderIds, selectWithdrawable } from "@/src/lib/payouts";
import { formatDrcPhone } from "@/src/lib/phone";
import { WithdrawForm } from "./WithdrawForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Retirer" };

export default async function WithdrawPage() {
  const user = await requireRole(["rider"]);
  if (!user || !user.riderId) return <AccessRequired role="livreur" />;
  const [orders, payouts, rider] = await Promise.all([
    listOrdersForRider(user.riderId),
    listRiderPayouts(user.riderId),
    getRider(user.riderId),
  ]);
  const { amountUsd } = selectWithdrawable(orders, lockedPayoutOrderIds(payouts));

  return (
    <div className="py-2">
      <Link href="/rider/gains" className="text-sm font-medium text-gray-600">
        ← Gains
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Retirer</h1>
      {amountUsd <= 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <div className="font-semibold">Rien à retirer</div>
          <p className="mt-1 text-sm text-gray-600">Tes courses en attente sont déjà dans une demande, ou déjà versées.</p>
        </div>
      ) : (
        <WithdrawForm amountUsd={amountUsd} defaultPhone={rider?.phone ? formatDrcPhone(rider.phone) : ""} />
      )}
    </div>
  );
}
