import Link from "next/link";
import { Lock } from "lucide-react";

export function AccessRequired({ role }: { role: "commerçant" | "livreur" | "admin" | "client" }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <Lock className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="mt-4 text-xl font-bold">Accès {role} requis</h1>
      <p className="mt-1 text-sm text-gray-600">Connecte-toi avec un compte {role} pour ouvrir cet espace.</p>
      <Link
        href="/demo"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-medium text-white hover:bg-emerald-800"
        style={{ color: "#fff" }}
      >
        Choisir un compte démo
      </Link>
    </div>
  );
}
