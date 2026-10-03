/** French copy when checkout hits a dish that was marked unavailable. */
export function unavailableCheckoutMessage(names: string[]): string {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (clean.length === 0) {
    return "Un plat de ton panier n’est plus disponible. Retire-le du panier avant de commander.";
  }
  if (clean.length === 1) {
    return `« ${clean[0]} » est indisponible. Retire-le du panier : on ne prend pas commande d’un plat en rupture.`;
  }
  const list = clean.map((n) => `« ${n} »`).join(", ");
  return `${list} sont indisponibles. Retire-les du panier avant de commander.`;
}
