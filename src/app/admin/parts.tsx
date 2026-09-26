import Link from "next/link";
import type { Order } from "@/src/lib/types";
import { articleCountLabel, cn, formatDateFr, formatPriceUSD, paymentLabelFr, statusLabelFr } from "@/src/lib/utils";

export function statusTone(status: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  if (status === "placed") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

export function OrderRow({ o, restaurantName }: { o: Order; restaurantName?: string }) {
  return (
    <li>
      <Link href={`/order/${o.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50 sm:p-4" style={{ color: "inherit" }}>
        <div className="min-w-0">
          <div className="truncate font-medium">
            #{o.id.slice(-6)} · {restaurantName ?? (o.restaurantId ? "Restaurant" : "Trouvailles")}
          </div>
          <div className="truncate text-xs text-gray-600">
            {formatDateFr(o.createdAt)} · {articleCountLabel(o.items)} · {paymentLabelFr(o.paymentMethod)} · {o.zone}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold">{formatPriceUSD(o.totalUsd)}</div>
          <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium", statusTone(o.status))}>{statusLabelFr(o.status)}</span>
        </div>
      </Link>
    </li>
  );
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card-elevated overflow-hidden border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
