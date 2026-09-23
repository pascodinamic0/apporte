import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Utensils, Package } from "lucide-react";

export default function Home() {
  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Qu’est-ce dont tu as besoin ?
      </h1>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Link href="/food">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <Utensils className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-medium">Nourriture</div>
                <div className="text-sm text-gray-600">Restaurants à Gombe et alentours</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-32 w-full rounded-lg bg-[url('/globe.svg')] bg-cover bg-center opacity-80" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/smart-finds">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-medium">Trouvailles</div>
                <div className="text-sm text-gray-600">
                  Gadgets utiles et produits malins
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-32 w-full rounded-lg bg-[url('/window.svg')] bg-cover bg-center opacity-80" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
