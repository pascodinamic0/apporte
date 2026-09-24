-- Apporte Supabase schema migration
-- Generated for replacing in-memory store with Postgres

-- Users
create table if not exists public.users (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null check (role in ('customer','merchant','rider','admin')),
  merchant_id text,
  rider_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users enable row level security;

-- Restaurants
create table if not exists public.restaurants (
  id text primary key,
  name text not null,
  description text,
  cuisine text not null,
  eta_minutes integer not null,
  rating numeric(3,1) not null default 0,
  image_url text,
  zone text not null,
  latitude double precision not null,
  longitude double precision not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.restaurants enable row level security;

-- Menu Items
create table if not exists public.menu_items (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price_usd numeric(10,2) not null,
  available boolean not null default true,
  image_url text,
  cuisine_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_menu_items_restaurant on public.menu_items(restaurant_id);
alter table public.menu_items enable row level security;

-- Smart Find Products
create table if not exists public.smart_find_products (
  id text primary key,
  name text not null,
  description text,
  price_usd numeric(10,2) not null,
  stock integer not null default 0,
  category text not null, -- ('Automotive' | 'Mobile & Tech' | 'Home' | 'Lifestyle')
  image_url text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.smart_find_products enable row level security;

-- Riders
create table if not exists public.riders (
  id text primary key,
  name text not null,
  status text not null check (status in ('offline','online','busy')) default 'offline',
  reliability_percent integer not null default 0,
  latitude double precision not null,
  longitude double precision not null,
  earnings_today_usd numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.riders enable row level security;

-- Orders
create table if not exists public.orders (
  id text primary key,
  customer_id text not null references public.users(id),
  restaurant_id text references public.restaurants(id),
  rider_id text references public.riders(id),
  subtotal_usd numeric(10,2) not null,
  delivery_fee_usd numeric(10,2) not null,
  total_usd numeric(10,2) not null,
  address text not null,
  zone text not null,
  payment_method text not null check (payment_method in ('Mobile Money','Cash on delivery','Card')),
  status text not null check (status in ('placed','restaurant_accepted','preparing','rider_searching','rider_assigned','going_to_restaurant','arrived','picked_up','delivering','delivered','cancelled')),
  pin text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rating_stars smallint,
  rating_comment text,
  rating_created_at timestamptz
);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_restaurant on public.orders(restaurant_id);
create index if not exists idx_orders_rider on public.orders(rider_id);
create index if not exists idx_orders_status on public.orders(status);
alter table public.orders enable row level security;

-- Order Items
create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('food','smart_find')),
  restaurant_id text references public.restaurants(id),
  menu_item_id text references public.menu_items(id),
  product_id text references public.smart_find_products(id),
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_usd numeric(10,2) not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);
alter table public.order_items enable row level security;

-- Support Notes
create table if not exists public.support_notes (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  note text not null,
  created_by text not null, -- user id or 'admin'
  created_at timestamptz not null default now()
);
create index if not exists idx_support_notes_order on public.support_notes(order_id);
alter table public.support_notes enable row level security;

-- Dispatch Queues (per-order ranked rider queue for offers)
create table if not exists public.dispatch_queues (
  order_id text primary key references public.orders(id) on delete cascade,
  rider_ids text[] not null,
  current_index integer not null default 0,
  expire_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dispatch_queues enable row level security;

