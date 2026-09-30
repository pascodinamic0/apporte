"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Banknote, MapPin, Utensils } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/src/lib/utils";
import { enablePush, pushSupport } from "@/src/lib/client/push";

const KEY = "apporte_onboarded_v1";
const SLIDES = [
  { img: "/images/hero-home.jpg", icon: Utensils, title: "Les meilleurs restaurants de Gombe", text: "Poulet braisé, pizzas, sushis, cuisine congolaise… Commande en quelques secondes." },
  { img: "/images/map.jpg", icon: MapPin, title: "Suis ta commande en direct", text: "Acceptée, en préparation, en route : tout se met à jour tout seul. Donne ton code PIN au livreur à l’arrivée." },
  { img: "/images/chicken.jpg", icon: Banknote, title: "Tu paies à la livraison", text: "Cash à la réception, TVA incluse, frais de livraison affichés avant de commander." },
];

/** Short first-run onboarding for customers (shown once per device). */
export function Onboarding({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!(pathname === "/" || pathname === "/food")) return;
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {}
  }, [pathname]);
  if (!open) return null;
  const done = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const canPush = signedIn && (pushSupport() === "default");
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="onb-title" data-testid="onboarding">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div className="relative m-0 w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:m-4 sm:rounded-3xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="relative h-52 sm:h-60">
          <Image src={s.img} alt="" fill sizes="448px" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
          <button type="button" onClick={done} className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-800 shadow" data-testid="onboarding-skip">Passer</button>
          <span className="absolute bottom-3 left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg">
            <s.icon className="h-6 w-6" aria-hidden />
          </span>
        </div>
        <div className="px-6 pb-6 pt-3">
          <h2 id="onb-title" className="text-xl font-extrabold tracking-tight">{s.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{s.text}</p>
          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-1.5" aria-label={`Étape ${i + 1} sur ${SLIDES.length}`}>
              {SLIDES.map((_, j) => (
                <span key={j} className={cn("h-2 rounded-full transition-all", j === i ? "w-6 bg-emerald-700" : "w-2 bg-gray-300")} />
              ))}
            </div>
            {last ? (
              <div className="flex gap-2">
                {canPush && (
                  <Button variant="outline" className="rounded-full" onClick={async () => { await enablePush().catch(() => null); done(); }}>
                    Activer les alertes
                  </Button>
                )}
                <Button className="rounded-full" onClick={done} data-testid="onboarding-done">C’est parti</Button>
              </div>
            ) : (
              <Button className="rounded-full" onClick={() => setI(i + 1)} data-testid="onboarding-next">
                Suivant <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
