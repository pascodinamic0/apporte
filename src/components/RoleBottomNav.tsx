"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { isActive, navItemsForRole } from "./nav-items";

type Role = "merchant" | "rider" | "admin";

export function RoleBottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navItemsForRole(role, true).map((i) => (i.href === "/admin" ? { ...i, label: "Accueil" } : i));
  return (
    <nav
      role="navigation"
      aria-label="Navigation par rôle"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden safe-bottom"
    >
      <ul className="flex items-center justify-around py-2 min-h-16">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(pathname, it);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-14 flex-col items-center text-[11px] leading-none px-1.5 py-1.5 transition-transform active:scale-95",
                  active ? "text-emerald-700 font-semibold" : "text-gray-700",
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
