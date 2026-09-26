"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";

export const ADMIN_SECTIONS = [
  { href: "/admin", label: "Vue d’ensemble" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/marchands", label: "Marchands" },
  { href: "/admin/livreurs", label: "Livreurs" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections admin" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {ADMIN_SECTIONS.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap",
              active ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
            )}
            style={active ? { color: "#fff" } : undefined}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
