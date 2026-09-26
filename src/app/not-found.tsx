import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { StatusScreen } from "@/src/components/StatusScreen";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <StatusScreen
      code="ERREUR 404"
      title="Cette page n’existe pas"
      actions={
        <>
          <Link href="/"><Button className="w-full sm:w-auto">Retour à l’accueil</Button></Link>
          <Link href="/food"><Button variant="outline" className="w-full sm:w-auto">Voir les restaurants</Button></Link>
        </>
      }
    >
      Le lien est peut-être incomplet, ou la page a été déplacée. Pas de panique, ton panier est toujours là.
    </StatusScreen>
  );
}
