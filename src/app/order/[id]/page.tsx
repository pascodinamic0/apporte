import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrder } from "@/src/lib/data/db";
import { OrderClient } from "./OrderClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suivi de commande", robots: { index: false } };

const steps = [
  "placed",
  "restaurant_accepted",
  "preparing",
  "rider_searching",
  "rider_assigned",
  "going_to_restaurant",
  "arrived",
  "picked_up",
  "delivering",
  "delivered",
] as const;

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Read directly from in-process data layer to avoid self-fetch issues
  const order = await getOrder(id);
  if (!order) return notFound();
  return (
    <div className="py-2">
      <OrderClient orderId={order.id} />
    </div>
  );
}


