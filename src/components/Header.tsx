import Link from "next/link";
import { cn } from "@/src/lib/utils";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-emerald-800 text-lg">
          Apporte
        </Link>
        <nav className="hidden gap-6 md:flex text-sm text-gray-700">
          <Link href="/food" className="hover:text-emerald-700">
            Nourriture
          </Link>
          <Link href="/smart-finds" className="hover:text-emerald-700">
            Trouvailles
          </Link>
          <Link href="/support" className="hover:text-emerald-700">
            Aide
          </Link>
          <Link href="/demo" className="hover:text-emerald-700">
            Démo
          </Link>
        </nav>
      </div>
    </header>
  );
}

