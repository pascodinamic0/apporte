import type { Order, OrderStatus } from "@/src/lib/types";

/** What the kitchen board needs: no PIN, no phone. */
export type BoardOrder = {
  id: string;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  acceptedAt?: number;
  prepMinutes?: number;
  items: { id: string; name: string; quantity: number; unitPriceUsd: number; imageUrl?: string }[];
  subtotalUsd: number;
  commissionUsd?: number;
  totalUsd: number;
  addressNotes?: string;
  zone: string;
  riderName?: string;
  cancelReason?: string;
  cancelledBy?: string;
};

export function toBoardOrder(o: Order, riderName: Map<string, string>): BoardOrder {
  return {
    id: o.id,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    acceptedAt: o.acceptedAt,
    prepMinutes: o.prepMinutes,
    items: o.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, unitPriceUsd: i.unitPriceUsd, imageUrl: i.imageUrl })),
    subtotalUsd: o.subtotalUsd,
    commissionUsd: o.commissionUsd,
    totalUsd: o.totalUsd,
    addressNotes: o.addressNotes,
    zone: o.zone,
    riderName: o.riderId ? riderName.get(o.riderId) : undefined,
    cancelReason: o.cancelReason,
    cancelledBy: o.cancelledBy,
  };
}
