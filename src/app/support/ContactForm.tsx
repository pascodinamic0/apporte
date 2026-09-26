"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SUPPORT_EMAIL } from "@/src/lib/contact";

const TOPICS = ["Question sur une commande", "Article manquant ou erroné", "Livraison en retard", "Devenir restaurant partenaire", "Devenir livreur", "Autre"];

/**
 * Honest contact form: it prepares an email to the support address in the
 * user's mail app (no hidden backend pretends to have received it).
 */
export function ContactForm({ orders, name, email }: { orders: { id: string; label: string }[]; name?: string; email?: string }) {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [order, setOrder] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError("Décris ta demande en quelques mots (10 caractères minimum).");
      return;
    }
    setError(null);
    const subject = `[Apporte] ${topic}${order ? ` – commande #${order.slice(-6)}` : ""}`;
    const body = [message.trim(), "", "—", name ? `Nom : ${name}` : "", email ? `Compte : ${email}` : "", order ? `Commande : ${order}` : ""]
      .filter((l, i) => l || i < 3)
      .join("\n");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success("Ton application e-mail s’ouvre avec le message prêt à envoyer.");
  }

  const field = "w-full rounded-xl border border-gray-300 bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";
  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Sujet
          <select className={`${field} h-11`} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        {orders.length > 0 && (
          <label className="grid gap-1.5 text-sm font-medium">
            Commande concernée
            <select className={`${field} h-11`} value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="">Aucune</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Message
        <textarea
          className={`${field} py-2.5`}
          rows={4}
          maxLength={1500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Explique-nous ce qui se passe…"
          aria-invalid={!!error}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full gap-2 sm:w-auto sm:justify-self-start">
        <Send className="h-4 w-4" aria-hidden /> Préparer l’e-mail
      </Button>
      <p className="text-xs text-gray-500">Nous répondons par e-mail, en général dans la journée (heure de Kinshasa).</p>
    </form>
  );
}
