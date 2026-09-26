"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { StatusScreen } from "@/src/components/StatusScreen";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusScreen
      code="OUPS"
      title="Quelque chose s’est mal passé"
      actions={
        <>
          <Button className="w-full sm:w-auto" onClick={() => retry()}>Réessayer</Button>
          <Link href="/"><Button variant="outline" className="w-full sm:w-auto">Retour à l’accueil</Button></Link>
        </>
      }
    >
      Nous n’avons pas pu afficher cette page. Vérifie ta connexion puis réessaie.
      {error.digest && <div className="mt-2 text-xs text-gray-400">Référence : {error.digest}</div>}
    </StatusScreen>
  );
}
