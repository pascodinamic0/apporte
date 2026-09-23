"use client";
import Link from "next/link";
import { cn } from "@/src/lib/utils";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const isRoleArea =
    pathname.startsWith("/merchant") || pathname.startsWith("/rider") || pathname.startsWith("/admin");
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-emerald-800 text-lg">
          Apporte
        </Link>
        {!isRoleArea ? (
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
        ) : (
          <nav className="hidden gap-4 md:flex text-sm text-gray-700">
            {pathname.startsWith("/merchant") && (
              <>
                <Link href="/merchant" className="hover:text-emerald-700">
                  Commandes
                </Link>
                <Link href="/merchant/menu" className="hover:text-emerald-700">
                  Menu
                </Link>
                <Link href="/merchant/stats" className="hover:text-emerald-700">
                  Stats
                </Link>
              </>
            )}
            {pathname.startsWith("/rider") && (
              <Link href="/rider" className="hover:text-emerald-700">
                Livreur
              </Link>
            )}
            {pathname.startsWith("/admin") && (
              <Link href="/admin" className="hover:text-emerald-700">
                Admin
              </Link>
            )}
            <Link href="/demo" className="hover:text-emerald-700">
              Changer de rôle
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

