"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { User, Store, Bike, ShieldCheck } from "lucide-react";

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
      window.location.href = "/";
    } finally {
      setLoggingIn(null);
    }
  }
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Comptes Démo</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  {u.role === "customer" && <User className="h-5 w-5" />}
                  {u.role === "merchant" && <Store className="h-5 w-5" />}
                  {u.role === "rider" && <Bike className="h-5 w-5" />}
                  {u.role === "admin" && <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-sm text-gray-600">{u.email}</div>
                </div>
              </div>
              <div className="text-xs rounded-full bg-gray-100 px-2 py-1 capitalize">{u.role}</div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Button onClick={() => login(u.id)} disabled={loggingIn === u.id}>
                {loggingIn === u.id ? "Connexion..." : "Se connecter"}
              </Button>
              <div className="text-sm text-gray-600">
                {u.role === "customer" && "Aller à Accueil"}
                {u.role === "merchant" && "Aller à /merchant"}
                {u.role === "rider" && "Aller à /rider"}
                {u.role === "admin" && "Aller à /admin"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 text-sm text-gray-700">
        Mot de passe (démo): <code>Passw0rd!</code> — Simulation, pas de vrai paiement.
      </div>
    </div>
  );
}

