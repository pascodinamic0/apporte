Apporte — MVP (Kinshasa On‑Demand Commerce & Delivery)
======================================================

French‑first PWA that lets customers in Kinshasa order Food and curated “Smart Finds”, with merchants fulfilling and independent motorcycle riders delivering. One shared dispatch network. Built from Project Blueprint v1.0.

Tech stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + lightweight shadcn‑style UI components
- PWA: manifest + service worker (installable)
- Auth: Demo Mode with role switcher (Clerk optional)
- Data: **Supabase Postgres** (server-only service role client)

Quick start
1) Install deps:
```bash
npm install
```
2) Copy env and set Supabase credentials:
```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```
3) Apply schema + seed (see `supabase/README.md`), then:
```bash
npm run dev -- -p 43219
```
4) Open http://localhost:43219 and go to `/demo` to pick a demo account.

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

Environment variables
- Required (production):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose to the browser)
- Optional:
  - Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_BASE_URL`

Build & production
```bash
npm run build
npm start -p 43219
```

Deploy (Vercel)
- Set the two Supabase env vars on the Vercel project (Production + Preview).
- Run the SQL migration then seed once against your Supabase project (`supabase/README.md`).
- `vercel.json` is included.

Notes
- Pilot zone: Gombe; pricing in USD (CDF future support).
- This MVP intentionally avoids non‑MVP features (AI, wallet, live GPS maps, etc.) per Blueprint §44.
