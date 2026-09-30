-- Milestone 2 ("real-time and complete roles") — additive only, safe to re-run.
-- Existing users, restaurants, dishes and orders are kept.

-- 1) Fee settings (single row) — defaults accepted by Pascal:
--    15% restaurant commission, rider keeps 80% of the delivery fee, 16% TVA (included in prices).
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  commission_pct numeric(5,2) not null default 15 check (commission_pct >= 0 and commission_pct <= 100),
  rider_share_pct numeric(5,2) not null default 80 check (rider_share_pct >= 0 and rider_share_pct <= 100),
  vat_pct numeric(5,2) not null default 16 check (vat_pct >= 0 and vat_pct <= 100),
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- 2) Delivery zones: fee $2–$4 by zone. Only Gombe is served today.
create table if not exists public.zones (
  id text primary key,
  name text not null unique,
  delivery_fee_usd numeric(10,2) not null check (delivery_fee_usd >= 0 and delivery_fee_usd <= 50),
  active boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.zones (id, name, delivery_fee_usd, active, sort_order) values
  ('zone_gombe','Gombe',2.00,true,1),
  ('zone_lingwala','Lingwala',2.50,false,2),
  ('zone_barumbu','Barumbu',2.50,false,3),
  ('zone_kinshasa','Kinshasa',3.00,false,4),
  ('zone_kintambo','Kintambo',3.00,false,5),
  ('zone_ngaliema','Ngaliema',3.50,false,6),
  ('zone_limete','Limete',4.00,false,7)
on conflict (id) do nothing;

-- 3) Restaurants: open/pause switch, weekly hours (Kinshasa time), admin suspension, commission override.
alter table public.restaurants add column if not exists accepting_orders boolean not null default true;
alter table public.restaurants add column if not exists hours jsonb;
alter table public.restaurants add column if not exists suspended boolean not null default false;
alter table public.restaurants add column if not exists commission_pct numeric(5,2);
alter table public.restaurants add column if not exists phone text;
alter table public.restaurants add column if not exists created_at timestamptz not null default now();
-- hours: 7 entries, index 0 = Sunday. close earlier than open = closes after midnight.
update public.restaurants set hours = '[
  {"open":"10:00","close":"23:00","closed":false},
  {"open":"09:00","close":"23:00","closed":false},
  {"open":"09:00","close":"23:00","closed":false},
  {"open":"09:00","close":"23:00","closed":false},
  {"open":"09:00","close":"23:00","closed":false},
  {"open":"09:00","close":"00:30","closed":false},
  {"open":"10:00","close":"00:30","closed":false}
]'::jsonb where hours is null;

-- 4) Dishes: categories, order, soft delete (order_items keep their reference).
alter table public.menu_items add column if not exists category text;
alter table public.menu_items add column if not exists sort_order integer not null default 0;
alter table public.menu_items add column if not exists archived boolean not null default false;
update public.menu_items set category = case
  when cuisine_tag = 'Accompagnement' then 'Accompagnements'
  when cuisine_tag = 'Boisson' then 'Boissons'
  when cuisine_tag = 'Dessert' then 'Desserts'
  else 'Plats' end
where category is null;

-- 5) Orders: stored fee breakdown, map pin, cancel/refund, prep time, timestamps.
alter table public.orders add column if not exists commission_usd numeric(10,2);
alter table public.orders add column if not exists rider_earning_usd numeric(10,2);
alter table public.orders add column if not exists vat_usd numeric(10,2);
alter table public.orders add column if not exists delivery_lat double precision;
alter table public.orders add column if not exists delivery_lng double precision;
alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists cancelled_by text;
alter table public.orders add column if not exists refund_flag boolean not null default false;
alter table public.orders add column if not exists refund_note text;
alter table public.orders add column if not exists prep_minutes integer;
alter table public.orders add column if not exists accepted_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- 6) Riders: suspension and phone.
alter table public.riders add column if not exists suspended boolean not null default false;
alter table public.riders add column if not exists phone text;
alter table public.riders add column if not exists created_at timestamptz not null default now();

-- 7) Customer saved addresses (map pin).
create table if not exists public.saved_addresses (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  label text not null,
  address text not null,
  notes text,
  zone text not null default 'Gombe',
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists saved_addresses_user_idx on public.saved_addresses(user_id);

-- 8) Web push subscriptions.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id text not null references public.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- Server uses the service role; keep RLS on with no public policies.
alter table public.app_settings enable row level security;
alter table public.zones enable row level security;
alter table public.saved_addresses enable row level security;
alter table public.push_subscriptions enable row level security;

-- 9) Public bucket for dish / restaurant photos (uploads go through the server).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos','menu-photos',true,4194304,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
