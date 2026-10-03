-- Out-of-stock must be handled before payment. Cash on delivery stays unpaid
-- until the rider is paid; a paid order cannot be refused (no refunds yet).
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('unpaid', 'paid'));
