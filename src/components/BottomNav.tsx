"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { ShoppingCart, Home, Utensils, Package, HelpCircle } from "lucide-react";

const items = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/food", label: "Nourriture", icon: Utensils },
  { href: "/smart-finds", label: "Trouvailles", icon: Package },
  { href: "/cart", label: "Panier", icon: ShoppingCart },
  { href: "/support", label: "Aide", icon: HelpCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
      <ul className="flex items-center justify-around py-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center text-xs",
                  active ? "text-emerald-700" : "text-gray-600",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

