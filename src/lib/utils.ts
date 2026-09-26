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
      return "En route vers le restaurant";
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


export function paymentLabelFr(method: string | undefined | null): string {
  switch (method) {
    case "Cash on delivery":
      return "Cash à la livraison";
    case "Mobile Money":
      return "Mobile Money";
    case "Card":
      return "Carte bancaire";
    default:
      return method || "—";
  }
}

export function riderStatusLabelFr(status: string): string {
  switch (status) {
    case "online":
      return "En ligne";
    case "offline":
      return "Hors ligne";
    case "busy":
      return "Occupé";
    default:
      return status;
  }
}

export function roleLabelFr(role: string | undefined | null): string {
  switch (role) {
    case "customer":
      return "Client";
    case "merchant":
      return "Commerçant";
    case "rider":
      return "Livreur";
    case "admin":
      return "Administrateur";
    default:
      return "Invité";
  }
}

/** Date in Kinshasa time, French format. */
export function formatDateFr(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
