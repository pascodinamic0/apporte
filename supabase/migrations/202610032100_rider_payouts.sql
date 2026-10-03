-- Rider withdrawal requests. Money is sent by the Apporte team, then the request is marked paid.

create table if not exists public.rider_payouts (
  id text primary key,
  rider_id text not null references public.riders(id),
  amount_usd numeric(10,2) not null,
  order_ids text[] not null,
  phone text not null,
  provider text not null check (provider in ('mpesa','airtel','orange','africell','mobile')),
  status text not null check (status in ('requested','paid','rejected')) default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_rider_payouts_rider on public.rider_payouts (rider_id, created_at desc);
create index if not exists idx_rider_payouts_status on public.rider_payouts (status, created_at desc);
alter table public.rider_payouts enable row level security;
