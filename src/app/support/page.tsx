import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

export default function SupportPage() {
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Support</h1>
      <Card>
        <CardHeader>Besoin d’aide ?</CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-sm text-gray-700">
            Contacte-nous sur WhatsApp pour l’assistance:
          </p>
          <Link href="https://wa.me/243000000000?text=Bonjour%20Apporte%2C%20j%27ai%20besoin%20d%27aide%20avec%20ma%20commande.">
            <Button variant="outline" className="w-full">Ouvrir WhatsApp</Button>
          </Link>
          <div className="mt-4">
            <div className="font-medium">FAQ (bientôt)</div>
            <ul className="list-disc text-sm text-gray-700 ml-5 mt-2">
              <li>Comment suivre ma commande ?</li>
              <li>Que faire si un article manque ?</li>
              <li>Comment demander un remboursement ?</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

