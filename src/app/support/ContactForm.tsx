"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SUPPORT_EMAIL } from "@/src/lib/contact";

const TOPICS = ["Question sur une commande", "Article manquant ou erroné", "Livraison en retard", "Devenir restaurant partenaire", "Devenir livreur", "Autre"];

export const RIDER_TOPICS = [
  "Je ne reçois pas de courses",
  "Comment accepter ou refuser",
  "Calcul de mes gains",
  "Le restaurant n’a pas la commande",
  "La commande n’est pas prête",
  "Le client ne répond pas",
  "Je ne trouve pas l’adresse",
  "Le client ne donne pas le PIN",
  "Problème de moto ou de véhicule",
  "Urgence : accident, menace ou panne",
  "Autre problème pendant une course",
];

const URGENT_TOPIC = "Urgence : accident, menace ou panne";

/** Customers open their mail app. Riders create an admin-visible request. */
export function ContactForm({
  orders,
  name,
  email,
  mode = "email",
  defaultOrderId = "",
}: {
  orders: { id: string; label: string }[];
  name?: string;
  email?: string;
  mode?: "email" | "ticket";
  defaultOrderId?: string;
}) {
  const topics = mode === "ticket" ? RIDER_TOPICS : TOPICS;
  const [topic, setTopic] = useState(topics[0]);
  const [order, setOrder] = useState(defaultOrderId);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError("Décris ta demande en quelques mots (10 caractères minimum).");
      return;
    }
    setError(null);
    if (mode === "ticket") {
      setSending(true);
      try {
        const r = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: priority === "urgent" ? URGENT_TOPIC : topic,
            message: message.trim(),
            orderId: order || undefined,
            priority,
          }),
        });
        if (!r.ok) {
          setError("Le message n’est pas parti. Réessaie dans un instant.");
          return;
        }
        setSent(true);
        setMessage("");
        toast.success(priority === "urgent" ? "Urgence transmise à l’équipe Apporte." : "Demande envoyée à l’équipe Apporte.");
      } catch {
        setError("Le message n’est pas parti. Vérifie ta connexion.");
      } finally {
        setSending(false);
      }
      return;
    }
    const subject = `[Apporte] ${topic}${order ? ` – commande #${order.slice(-6)}` : ""}`;
    const body = [message.trim(), "", "—", name ? `Nom : ${name}` : "", email ? `Compte : ${email}` : "", order ? `Commande : ${order}` : ""]
      .filter((l, i) => l || i < 3)
      .join("\n");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success("Ton application e-mail s’ouvre avec le message prêt à envoyer.");
  }

  const field = "w-full rounded-xl border border-gray-300 bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";
  if (sent && mode === "ticket") {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">C’est bien reçu.</p>
        <p className="mt-1">L’équipe voit ta demande. Tu peux en envoyer une autre si la situation change.</p>
        <button type="button" className="mt-3 font-medium underline" onClick={() => setSent(false)}>
          Nouvelle demande
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      {mode === "ticket" && (
        <button
          type="button"
          onClick={() => setPriority((p) => (p === "urgent" ? "normal" : "urgent"))}
          className={`rounded-xl border px-4 py-3 text-left text-sm ${priority === "urgent" ? "border-red-600 bg-red-50 text-red-900" : "border-red-200 bg-white text-red-800"}`}
        >
          <span className="font-semibold">{priority === "urgent" ? "Urgence signalée" : "C’est une urgence"}</span>
          <span className="mt-0.5 block text-xs">Accident, panne, menace ou autre danger pendant une course. L’équipe le voit en priorité.</span>
        </button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Sujet
          <select className={`${field} h-11`} value={priority === "urgent" ? URGENT_TOPIC : topic} onChange={(e) => { const next = e.target.value; setTopic(next); setPriority(next === URGENT_TOPIC ? "urgent" : "normal"); }} disabled={priority === "urgent"}>
            {topics.map((t) => <option key={t}>{t}</option>)}
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
      <Button type="submit" className="w-full gap-2 sm:w-auto sm:justify-self-start" disabled={sending}>
        <Send className="h-4 w-4" aria-hidden /> {mode === "ticket" ? (sending ? "Envoi…" : "Envoyer à l’équipe") : "Préparer l’e-mail"}
      </Button>
      <p className="text-xs text-gray-500">
        {mode === "ticket"
          ? "La demande arrive dans le tableau admin, avec le numéro de ta course en cours s’il y en a une."
          : "Nous répondons par e-mail, en général dans la journée (heure de Kinshasa)."}
      </p>
    </form>
  );
}
