### Supabase setup for Apporte

This directory contains the database migration and seed for replacing the in-memory data store with Supabase Postgres.

- Migration: `supabase/migrations/202609240900_init.sql`
- Seed: `supabase/seed.sql`

Required environment variables (set in your Vercel project):
- `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service role key (server only; never expose to the browser)

How to apply:
1) Open the Supabase SQL editor for your project and run the migration file first:
   - Paste the entire contents of `supabase/migrations/202609240900_init.sql`
   - Execute it once (it is idempotent where it matters and safe to rerun)
2) Seed demo data:
   - Paste the contents of `supabase/seed.sql` and execute
   - The seed is idempotent (UPSERT/ON CONFLICT)

Optional (psql):
```bash
# Migration
psql "$SUPABASE_DB_URL" -f supabase/migrations/202609240900_init.sql
# Seed
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Verify production is wired
```sql
-- Demo seed present?
select count(*) as restaurants from public.restaurants;
select count(*) as menu_items from public.menu_items;

-- Orphan orders (totals without line items) — safe to delete if test junk
select o.id, o.total_usd, o.status, o.created_at
from public.orders o
left join public.order_items oi on oi.order_id = o.id
group by o.id
having count(oi.id) = 0;
```

To clean orphan test orders:
```sql
delete from public.orders
where id in (
  select o.id
  from public.orders o
  left join public.order_items oi on oi.order_id = o.id
  group by o.id
  having count(oi.id) = 0
);
```

Notes:
- Row Level Security (RLS) is enabled on all tables. No public policies are defined; the server uses the Supabase service role which bypasses RLS.
- Demo users and content in the seed match the IDs used throughout the app (e.g. `u_customer`, `u_merchant` with `merchant_id = rest_kfc_gombe`, `rider_1`, restaurants, menus, smart finds).
