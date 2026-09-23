Apporte — MVP (Kinshasa On‑Demand Commerce & Delivery)
======================================================

French‑first PWA that lets customers in Kinshasa order Food and curated “Smart Finds”, with merchants fulfilling and independent motorcycle riders delivering. One shared dispatch network. Built from Project Blueprint v1.0.

Tech stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + lightweight shadcn‑style UI components
- PWA: manifest + service worker (installable)
- Auth: Clerk (optional), plus Demo Mode with role switcher and demo accounts
- Data: Demo mode in‑memory store with Kinshasa seed data (Gombe). Drizzle/Neon placeholder ready via envs (not required).

Quick start (Demo Mode)
1) Install deps:
```bash
npm install
```
2) Start dev server (uses port 43219 in this guide):
```bash
npm run dev -- -p 43219
```
3) Open http://localhost:43219 and go to `/demo` to pick a demo account.

Demo accounts (/demo)
- customer@demo.apporte.cd / Passw0rd!
- merchant@demo.apporte.cd / Passw0rd!
- rider@demo.apporte.cd / Passw0rd!
- admin@demo.apporte.cd / Passw0rd!

MVP flows (happy path)
- Customer: Accueil → Nourriture → Choisir resto → Ajouter au panier → Passer à la caisse → “Ajouter à ma livraison” (Smart Finds) → Confirmer → Suivre la commande → Voir le PIN → Évaluer après livraison.
- Merchant: Voir Commandes → Accepter → En préparation → Prêt (le système cherche un livreur).
- Rider: Passer en Online → Recevoir offre → Accepter → Vers pickup → Arrivé → Récupéré → En livraison → Entrer PIN → Terminer.
- Admin: Voir listes (commandes, livreurs, commerçants, clients) + métriques de base.

Environment variables (.env.example)
- Clerk (optional):
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  - CLERK_SECRET_KEY=
- Database (optional; not required for demo):
  - DATABASE_URL=
- NEXT_PUBLIC_BASE_URL= (optional, for server actions absolute URL)

Build & production
```bash
npm run build
npm start -p 43219
```
If env vars are absent, the app runs fully in Demo Mode with seed data.

Deploy (Vercel)
- Add env vars if integrating Clerk/Neon; otherwise Demo Mode will run without secrets.
- `vercel.json` is included.

Notes
- Pilot zone: Gombe; pricing in USD (CDF future support).
- PWA: `manifest` and `sw.js` included. Add PNG icons as needed for stores/devices.
- This MVP intentionally avoids non‑MVP features (AI, wallet, GPS maps, etc.) per Blueprint §44.

