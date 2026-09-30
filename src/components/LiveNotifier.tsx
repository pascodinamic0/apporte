"use client";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useLive, type LiveEvent } from "@/src/lib/client/live";
import { customerStatusText } from "@/src/lib/statusText";
import type { UserRole } from "@/src/lib/types";

/**
 * In-app notifications (the fallback when web push is unavailable or the app
 * is open): new order for merchants, new offer for riders, status for customers.
 * Screens that already show the event live (board, rider home, tracking) are skipped.
 */
export function LiveNotifier({ role, userId, merchantId, riderId }: { role: UserRole; userId: string; merchantId?: string; riderId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const topics =
    role === "merchant" && merchantId
      ? [`restaurant:${merchantId}`]
      : role === "rider" && riderId
        ? ["riders", `rider:${riderId}`]
        : role === "customer"
          ? [`customer:${userId}`]
          : [];

  useLive(
    topics,
    (e: LiveEvent) => {
      if (e.type === "poll" || e.type === "resync") return;
      if (role === "merchant" && e.type === "order_created" && e.status === "placed" && pathname !== "/merchant") {
        toast((t) => (
          <button type="button" className="text-left" onClick={() => { toast.dismiss(t.id); router.push("/merchant"); }}>
            <b>Nouvelle commande</b>
            <br />
            <span className="text-sm text-gray-600">Touchez pour ouvrir le tableau</span>
          </button>
        ), { icon: "🔔", id: `n-${e.orderId}`, duration: 8000 });
      }
      if (role === "rider" && e.topic === "riders" && e.status === "rider_searching" && pathname !== "/rider") {
        toast((t) => (
          <button type="button" className="text-left" onClick={() => { toast.dismiss(t.id); router.push("/rider"); }}>
            <b>Nouvelle course disponible</b>
            <br />
            <span className="text-sm text-gray-600">Touchez pour voir l’offre</span>
          </button>
        ), { icon: "🛵", id: `o-${e.orderId}`, duration: 8000 });
      }
      if (role === "rider" && e.topic === `rider:${riderId}` && e.status === "cancelled") {
        toast.error("Une course a été annulée par le support.", { id: `c-${e.orderId}` });
      }
      if (role === "customer" && e.type === "order_updated" && e.orderId && pathname !== `/order/${e.orderId}`) {
        const text = customerStatusText(e.status);
        if (text) {
          toast((t) => (
            <button type="button" className="text-left" onClick={() => { toast.dismiss(t.id); router.push(`/order/${e.orderId}`); }}>
              {text}
              <br />
              <span className="text-sm text-emerald-700">Voir le suivi</span>
            </button>
          ), { id: `s-${e.orderId}-${e.status}`, duration: 6000 });
        }
      }
    },
    { pollMs: 3_600_000, fastPollMs: 3_600_000 },
  );
  return null;
}
