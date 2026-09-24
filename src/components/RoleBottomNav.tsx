"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import {
  ClipboardList,
  Utensils,
  BarChart3,
  Bike,
  Home,
  LifeBuoy,
  User,
} from "lucide-react";

type Item = { href: string; label: string; icon: any };

function useRoleNavItems(pathname: string): Item[] | null {
  if (pathname.startsWith("/merchant")) {
    return [
      { href: "/merchant", label: "Commandes", icon: ClipboardList },
      { href: "/merchant/menu", label: "Menu", icon: Utensils },
      { href: "/merchant/stats", label: "Stats", icon: BarChart3 },
      { href: "/demo", label: "Rôle", icon: User },
    ];
  }
  if (pathname.startsWith("/rider")) {
    return [
      { href: "/rider", label: "Courses", icon: Bike },
      { href: "/support", label: "Support", icon: LifeBuoy },
      { href: "/demo", label: "Rôle", icon: User },
    ];
  }
  if (pathname.startsWith("/admin")) {
    return [
      { href: "/admin", label: "Accueil", icon: Home },
      { href: "/support", label: "Support", icon: LifeBuoy },
      { href: "/demo", label: "Rôle", icon: User },
    ];
  }
  return null;
}

export function RoleBottomNav() {
  const pathname = usePathname();
  const items = useRoleNavItems(pathname);
  if (!items) return null;
  return (
    <nav
      role="navigation"
      aria-label="Navigation par rôle"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden safe-bottom"
    >
      <ul className="flex items-center justify-around py-2 min-h-16">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center text-[11px] leading-none px-2 py-1.5",
                  active ? "text-emerald-700 font-medium" : "text-gray-700",
                )}
              >
                <Icon aria-hidden className="h-5 w-5" />
                <span className="mt-1">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

