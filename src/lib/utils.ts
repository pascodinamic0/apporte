import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPriceUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** French article count label, e.g. "2 articles" or "Détails indisponibles". */
export function articleCountLabel(
  items: { quantity?: number }[] | undefined | null,
): string {
  if (!items || items.length === 0) return "Détails indisponibles";
  const n = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  if (n <= 0) return "Détails indisponibles";
  return n === 1 ? "1 article" : `${n} articles`;
}

export function generatePin(length = 4): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export function randomId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function statusLabelFr(status: string): string {
  switch (status) {
    case "placed":
      return "Commande passée";
    case "restaurant_accepted":
      return "Restaurant a accepté";
    case "preparing":
      return "En préparation";
    case "rider_searching":
      return "Recherche d’un livreur";
    case "rider_assigned":
      return "Livreur assigné";
    case "going_to_restaurant":
      return "En route vers le pickup";
    case "arrived":
      return "Livreur arrivé";
    case "picked_up":
      return "Commande récupérée";
    case "delivering":
      return "En livraison";
    case "delivered":
      return "Livré";
    case "cancelled":
      return "Annulée";
    default:
      return status;
  }
}

