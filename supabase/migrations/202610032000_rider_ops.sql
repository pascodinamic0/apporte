-- Arrived-at-customer step, rider payout mark, and admin-visible support requests.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'placed',
    'restaurant_accepted',
    'preparing',
    'rider_searching',
    'rider_assigned',
    'going_to_restaurant',
    'arrived',
    'picked_up',
    'delivering',
    'arrived_at_customer',
    'delivered',
    'cancelled'
  ));

alter table public.orders add column if not exists rider_paid_at timestamptz;

create table if not exists public.support_requests (
  id text primary key,
  user_id text not null references public.users(id),
  user_name text not null,
  role text not null check (role in ('customer','merchant','rider','admin')),
  topic text not null,
  message text not null,
  order_id text references public.orders(id),
  priority text not null check (priority in ('normal','urgent')) default 'normal',
  status text not null check (status in ('open','in_progress','resolved')) default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_support_requests_status on public.support_requests (status, created_at desc);
alter table public.support_requests enable row level security;
