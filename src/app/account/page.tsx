import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardList, Info, LifeBuoy, Repeat, UserRound } from "lucide-react";
import { getCurrentUser } from "@/src/lib/auth";
import { listOrdersForCustomer } from "@/src/lib/data/db";
import { LogoutButton } from "@/src/components/LogoutButton";
import { cn, formatDateFr, formatPriceUSD, roleLabelFr, statusLabelFr } from "@/src/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon compte" };

const SPACE: Record<string, { href: string; label: string }> = {
  merchant: { href: "/merchant", label: "Espace commerçant" },
  rider: { href: "/rider", label: "Espace livreur" },
  admin: { href: "/admin", label: "Espace admin" },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <UserRound className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-bold">Tu n’es pas connecté</h1>
        <p className="mt-1 text-sm text-gray-600">Choisis un compte de démonstration pour commander et suivre tes livraisons.</p>
        <Link href="/demo" className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-medium text-white hover:bg-emerald-800" style={{ color: "#fff" }}>
          Se connecter
        </Link>
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link href="/support">Aide</Link>
          <Link href="/credits">Crédits photos</Link>
        </div>
      </div>
    );
  }
  const orders = user.role === "customer" ? await listOrdersForCustomer(user.id) : [];
  const space = SPACE[user.role];
  const links = [
    ...(space ? [{ href: space.href, label: space.label, icon: ClipboardList }] : [{ href: "/orders", label: "Mes commandes", icon: ClipboardList }]),
    { href: "/support", label: "Aide et contact", icon: LifeBuoy },
    { href: "/credits", label: "À propos et crédits photos", icon: Info },
    { href: "/demo", label: "Changer de compte (démo)", icon: Repeat },
  ];
  return (
    <div className="mx-auto max-w-2xl py-2">
      <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Mon compte</h1>
      <section className="card-elevated flex items-center gap-3 border border-gray-200 bg-white p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
          {user.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{user.name}</div>
          <div className="truncate text-sm text-gray-600">{user.email}</div>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{roleLabelFr(user.role)}</span>
      </section>

      <ul className="card-elevated mt-3 divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-3 px-4 py-3.5 text-gray-900 hover:bg-gray-50" style={{ color: "inherit" }}>
              <l.icon className="h-5 w-5 text-emerald-700" aria-hidden />
              <span className="flex-1">{l.label}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {user.role === "customer" && (
        <section className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Dernières commandes</h2>
            {orders.length > 3 && <Link href="/orders" className="text-sm font-medium">Tout voir</Link>}
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-600">Aucune commande pour l’instant.</p>
          ) : (
            <ul className="card-elevated divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white">
              {orders.slice(0, 3).map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50" style={{ color: "inherit" }}>
                    <div className="min-w-0">
                      <div className="font-medium">#{o.id.slice(-6)}</div>
                      <div className="text-xs text-gray-600">{formatDateFr(o.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-800">{formatPriceUSD(o.totalUsd)}</div>
                      <div className={cn("text-xs", o.status === "delivered" ? "text-gray-500" : "text-amber-700")}>{statusLabelFr(o.status)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
