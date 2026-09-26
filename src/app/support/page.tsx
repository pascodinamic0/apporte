import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getCurrentUser } from "@/src/lib/auth";
import { listOrdersForCustomer } from "@/src/lib/data/db";
import { SUPPORT_EMAIL } from "@/src/lib/contact";
import { ContactForm } from "./ContactForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Aide et contact",
  description: "Questions sur une commande Apporte à Kinshasa : suivi, article manquant, paiement à la livraison. Écris-nous.",
};

const FAQ = [
  {
    q: "Comment suivre ma commande ?",
    a: "Après avoir commandé, tu arrives sur la page de suivi. Tu la retrouves à tout moment dans Compte › Mes commandes. Elle se met à jour toute seule : restaurant, préparation, livreur, livraison.",
  },
  {
    q: "À quoi sert le PIN à 4 chiffres ?",
    a: "Il prouve que la commande t’a bien été remise. Donne-le au livreur seulement quand tu as ton sac en main : il le saisit pour terminer la course.",
  },
  {
    q: "Comment je paie ?",
    a: "Pour l’instant, uniquement en cash à la livraison : tu paies le livreur quand tu reçois ta commande. Le paiement Mobile Money (M-Pesa, Orange Money, Airtel Money) arrive bientôt.",
  },
  {
    q: "Où livrez-vous ?",
    a: "Uniquement dans la commune de la Gombe pour le moment. D’autres communes de Kinshasa suivront.",
  },
  {
    q: "Il manque un article ou il y a un problème. Que faire ?",
    a: "Écris-nous avec le numéro de commande (par exemple #ab12cd) grâce au formulaire ci-dessous. Comme tu paies à la livraison, vérifie ton sac avant de payer et signale tout de suite au livreur ce qui manque.",
  },
  {
    q: "Puis-je annuler une commande ?",
    a: "Contacte-nous au plus vite avec le numéro de commande. Tant que le restaurant n’a pas commencé la préparation, nous pouvons l’annuler.",
  },
];

export default async function SupportPage() {
  const user = await getCurrentUser();
  const orders = user?.role === "customer" ? (await listOrdersForCustomer(user.id)).slice(0, 10) : [];
  return (
    <div className="mx-auto max-w-3xl py-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Aide et contact</h1>
      <p className="mt-1 text-sm text-gray-600">Une question sur une commande ? Les réponses aux questions fréquentes sont ici.</p>

      <section className="mt-5" aria-labelledby="faq">
        <h2 id="faq" className="mb-2 text-lg font-semibold">Questions fréquentes</h2>
        <div className="card-elevated divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-4 py-3 open:bg-gray-50/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-xl leading-none text-gray-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-2 text-sm text-gray-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="contact">
        <h2 id="contact" className="mb-2 text-lg font-semibold">Nous écrire</h2>
        <div className="card-elevated border border-gray-200 bg-white p-4 sm:p-5">
          <ContactForm
            orders={orders.map((o) => ({ id: o.id, label: `#${o.id.slice(-6)}` }))}
            name={user?.name}
            email={user?.email}
          />
          <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-4 w-4" aria-hidden /> Ou directement : <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium">{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
