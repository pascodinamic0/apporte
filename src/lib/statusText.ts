const CUSTOMER_STATUS_TEXT: Record<string, string> = {
  restaurant_accepted: "Le restaurant a accepté ta commande.",
  preparing: "Ta commande est en préparation.",
  rider_assigned: "Un livreur a pris ta commande.",
  arrived: "Le livreur est au restaurant.",
  picked_up: "Ta commande a été récupérée.",
  delivering: "Ton livreur est en route. Prépare ton code PIN.",
  delivered: "Commande livrée. Bon appétit !",
  cancelled: "Ta commande a été annulée.",
};

export function customerStatusText(status: string | undefined): string | undefined {
  return status ? CUSTOMER_STATUS_TEXT[status] : undefined;
}
