"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { UserRole } from "@/src/lib/types";
import { isActive, navItemsForRole } from "./nav-items";

export function HeaderLinks({ role, signedIn }: { role: UserRole; signedIn: boolean }) {
  const pathname = usePathname();
  let items = navItemsForRole(role, signedIn);
  if (role === "customer") {
    items = items.filter((i) => i.href !== "/");
    items.splice(3, 0, { href: "/support", label: "Aide", icon: LifeBuoy });
    if (!signedIn) items = items.map((i) => (i.href === "/account" ? { ...i, href: "/demo", label: "Se connecter" } : i));
  }
  return (
    <nav aria-label="Navigation principale" className="flex items-center gap-1 text-sm">
      {items.map((it) => {
        const active = isActive(pathname, it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 whitespace-nowrap transition-colors",
              active ? "bg-emerald-50 font-semibold text-emerald-800" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
