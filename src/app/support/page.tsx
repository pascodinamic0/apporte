import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/src/lib/auth";
import { getRiderState, listOrdersForCustomer, listOrdersForRider } from "@/src/lib/data/db";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, whatsappLink } from "@/src/lib/contact";
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

const RIDER_FAQ = [
  {
    q: "Je ne reçois pas de courses. Que faire ?",
    a: "Passe En ligne et garde l’application ouverte sur Courses. Hors ligne, tu n’es pas éligible. Si tu es déjà Occupé, termine la course en cours : une nouvelle offre n’arrive qu’après.",
  },
  {
    q: "Comment accepter ou refuser une course ?",
    a: "L’offre affiche le restaurant, la zone de retrait, l’adresse, la distance, le délai et ton gain estimé. Accepter en fait ta course active. Refuser la renvoie au dispatch pour un autre livreur.",
  },
  {
    q: "Comment sont calculés mes gains ?",
    a: "Les frais suivent la distance entre le retrait et le centre de Gombe. Tu gardes 70 % de ces frais sur chaque course terminée. Le détail est dans Gains : aujourd’hui, 7 jours, total, et ce qui est en attente de versement ou déjà versé.",
  },
  {
    q: "Le restaurant n’a pas la commande. Que faire ?",
    a: "Ne pars pas avec un sac au hasard. Appelle le restaurant si tu as le numéro, puis envoie une demande ici avec la course concernée. Reste sur place le temps qu’on te réponde.",
  },
  {
    q: "La commande n’est pas prête. Que faire ?",
    a: "Confirme ton arrivée dans l’application, puis attends au restaurant. Si l’attente s’allonge, signale-le avec le numéro de course pour que l’équipe prévienne le client.",
  },
  {
    q: "Le client ne répond pas. Que faire ?",
    a: "Utilise le bouton Appeler sur la course. Si personne ne décroche, envoie une demande en indiquant depuis combien de temps tu es sur place.",
  },
  {
    q: "Je ne trouve pas le client ou l’adresse. Que faire ?",
    a: "Ouvre l’itinéraire vers le client, puis le repère indiqué sur la course. Appelle le client. Si tu es toujours bloqué, décris où tu te trouves dans une demande.",
  },
  {
    q: "Le client ne donne pas le PIN. Que faire ?",
    a: "Le PIN à 4 chiffres termine la course. Ne le demande qu’une fois le sac remis. S’il refuse, n’invente pas le code : envoie une demande, la course reste ouverte.",
  },
  {
    q: "Ma moto ou mon véhicule a un problème. Que faire ?",
    a: "Passe Hors ligne dès que tu peux, pour ne plus recevoir de courses. Si une course est en cours, marque l’urgence ci-dessous : l’équipe voit le numéro de commande.",
  },
  {
    q: "Comment signaler un problème pendant une livraison ?",
    a: "Le formulaire ci-dessous crée une demande visible par l’admin. Si tu as une course en cours, son numéro est joint automatiquement. Pour un accident, une menace ou une panne, utilise « C’est une urgence ».",
  },
];

export default async function SupportPage() {
  const user = await getCurrentUser();
  const isRider = user?.role === "rider" && !!user.riderId;
  const customerOrders = user?.role === "customer" ? (await listOrdersForCustomer(user.id)).slice(0, 10) : [];
  const riderOrders = isRider && user.riderId ? (await listOrdersForRider(user.riderId)).slice(0, 10) : [];
  const activeId = isRider && user.riderId ? (await getRiderState(user.riderId)).activeOrder?.id : undefined;
  const orders = (isRider ? riderOrders : customerOrders).map((o) => ({ id: o.id, label: `#${o.id.slice(-6)}` }));
  const faq = isRider ? RIDER_FAQ : FAQ;
  return (
    <div className="mx-auto max-w-3xl py-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Aide et contact</h1>
      <p className="mt-1 text-sm text-gray-600">
        {isRider ? "Un blocage sur une course ? Les réponses livreur sont ici, et l’équipe voit ta demande." : "Une question sur une commande ? Les réponses aux questions fréquentes sont ici."}
      </p>

      {SUPPORT_WHATSAPP && (
        <section className="mt-5" aria-labelledby="wa">
          <div className="card-elevated flex flex-col gap-3 border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 id="wa" className="font-semibold">Support WhatsApp 24h/24, 7j/7</h2>
              <p className="mt-0.5 text-sm text-gray-700">
                {isRider ? "Pour une urgence immédiate (accident, menace, panne), écris aussi sur WhatsApp." : "Le plus rapide : écris-nous sur WhatsApp avec ton numéro de commande."}
              </p>
            </div>
            <a
              href={whatsappLink(SUPPORT_WHATSAPP, isRider ? "URGENCE livreur Apporte — " : "Bonjour Apporte, j’ai besoin d’aide pour ma commande.")}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-support"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800"
              style={{ color: "white" }}
            >
              <MessageCircle className="h-5 w-5" aria-hidden /> Écrire sur WhatsApp
            </a>
          </div>
        </section>
      )}

      <section className="mt-5" aria-labelledby="faq">
        <h2 id="faq" className="mb-2 text-lg font-semibold">Questions fréquentes</h2>
        <div className="card-elevated divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white">
          {faq.map((f) => (
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
        <h2 id="contact" className="mb-2 text-lg font-semibold">{isRider ? "Écrire à l’équipe" : SUPPORT_WHATSAPP ? "Ou par e-mail" : "Nous écrire"}</h2>
        <div className="card-elevated border border-gray-200 bg-white p-4 sm:p-5">
          <ContactForm
            mode={isRider ? "ticket" : "email"}
            orders={orders}
            defaultOrderId={activeId}
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
