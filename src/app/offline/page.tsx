import type { Metadata } from "next";
import { StatusScreen } from "@/src/components/StatusScreen";
import { ReloadButton } from "./ReloadButton";

export const metadata: Metadata = { title: "Hors connexion", robots: { index: false } };

export default function OfflinePage() {
  return (
    <StatusScreen code="HORS CONNEXION" title="Pas de connexion internet" actions={<ReloadButton />}>
      Apporte a besoin d’internet pour charger les restaurants et suivre tes commandes. Ton panier est conservé sur ce téléphone :
      reconnecte-toi puis réessaie.
    </StatusScreen>
  );
}
