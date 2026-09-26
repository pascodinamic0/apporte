"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { User, Store, Bike, ShieldCheck } from "lucide-react";
import { roleLabelFr } from "@/src/lib/utils";

type DemoUser = { id: string; email: string; name: string; role: string };

export default function DemoPage() {
  const [users, setUsers] = useState<DemoUser[]>([
    { id: "u_customer", email: "customer@demo.apporte.cd", name: "Client Démo", role: "customer" },
    { id: "u_merchant", email: "merchant@demo.apporte.cd", name: "Restaurant Démo", role: "merchant" },
    { id: "u_rider", email: "rider@demo.apporte.cd", name: "Livreur Démo", role: "rider" },
    { id: "u_admin", email: "admin@demo.apporte.cd", name: "Admin Démo", role: "admin" },
  ]);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  async function login(id: string) {
    setLoggingIn(id);
    try {
      await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const role = users.find((u) => u.id === id)?.role ?? "customer";
      const dest =
        role === "merchant" ? "/merchant" : role === "rider" ? "/rider" : role === "admin" ? "/admin" : "/";
      window.location.href = dest;
    } finally {
      setLoggingIn(null);
    }
  }
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/apporte-lockup.svg" alt="Apporte" className="h-7" />
        <h1 className="text-xl font-semibold">Comptes démo</h1>
      </div>
      <div className="text-sm text-gray-700 mb-3">
        Bascule rapidement entre les rôles pour tester l’application.
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardHeader className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  {u.role === "customer" && <User className="h-5 w-5" />}
                  {u.role === "merchant" && <Store className="h-5 w-5" />}
                  {u.role === "rider" && <Bike className="h-5 w-5" />}
                  {u.role === "admin" && <ShieldCheck className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="font-medium">{u.name}</div>
                  <div className="truncate text-sm text-gray-600">{u.email}</div>
                </div>
              </div>
              <div className="shrink-0 text-xs rounded-full bg-gray-100 px-2 py-1">{roleLabelFr(u.role)}</div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <Button onClick={() => login(u.id)} disabled={loggingIn === u.id}>
                {loggingIn === u.id ? "Connexion..." : "Se connecter"}
              </Button>
            <div className="text-sm text-gray-600">
                {u.role === "customer" && "Aller à l’accueil"}
                {u.role === "merchant" && "Ouvrir l’espace commerçant"}
                {u.role === "rider" && "Ouvrir l’espace livreur"}
                {u.role === "admin" && "Ouvrir l’espace admin"}
            </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 text-sm text-gray-700">
        Connexion en un clic, sans mot de passe. Aucun paiement n’est encaissé : les commandes se règlent en cash à la livraison.
        <div className="mt-2">
          <Link href="/credits" className="text-emerald-700 underline">À propos / Crédits photos</Link>
        </div>
      </div>
    </div>
  );
}

