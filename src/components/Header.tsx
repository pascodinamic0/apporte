import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";

export async function Header() {
  const user = await getCurrentUser();
  const role = user?.role ?? "customer";
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/70 backdrop-blur">
      <div
        className="mx-auto max-w-5xl px-4 flex items-center justify-between"
        style={{ paddingTop: "max(var(--safe-top),12px)", paddingBottom: "12px", minHeight: "56px" }}
      >
        <Link href="/" className="flex items-center gap-2 text-emerald-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/apporte-lockup.svg" alt="Apporte" className="h-8" />
        </Link>
        {role === "customer" ? (
          <nav className="hidden gap-6 md:flex text-sm text-gray-700">
            <Link href="/food" className="hover:text-emerald-700">
              Nourriture
            </Link>
            <Link href="/smart-finds" className="hover:text-emerald-700">
              Trouvailles
            </Link>
            <Link href="/cart" className="hover:text-emerald-700">
              Panier
            </Link>
            <Link href="/demo" className="hover:text-emerald-700">
              Comptes Démo
            </Link>
          </nav>
        ) : role === "merchant" ? (
          <nav className="hidden gap-4 md:flex text-sm text-gray-700">
            <Link href="/merchant" className="hover:text-emerald-700">
              Commandes
            </Link>
            <Link href="/merchant/menu" className="hover:text-emerald-700">
              Menu
            </Link>
            <Link href="/merchant/stats" className="hover:text-emerald-700">
              Stats
            </Link>
            <Link href="/demo" className="hover:text-emerald-700">
              Changer de rôle
            </Link>
          </nav>
        ) : role === "rider" ? (
          <nav className="hidden gap-4 md:flex text-sm text-gray-700">
            <Link href="/rider" className="hover:text-emerald-700">
              Courses dispo
            </Link>
            <Link href="/rider" className="hover:text-emerald-700">
              Course active
            </Link>
            <Link href="/rider" className="hover:text-emerald-700">
              Historique
            </Link>
            <Link href="/demo" className="hover:text-emerald-700">
              Changer de rôle
            </Link>
          </nav>
        ) : (
          <nav className="hidden gap-4 md:flex text-sm text-gray-700">
            <Link href="/admin" className="hover:text-emerald-700">
              Vue d’ensemble
            </Link>
            <Link href="/admin" className="hover:text-emerald-700">
              Commandes
            </Link>
            <Link href="/admin" className="hover:text-emerald-700">
              Marchands
            </Link>
            <Link href="/admin" className="hover:text-emerald-700">
              Livreurs
            </Link>
            <Link href="/demo" className="hover:text-emerald-700">
              Changer de rôle
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

