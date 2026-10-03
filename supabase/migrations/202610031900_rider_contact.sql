-- Rider contact, visible to admins on the livreur fiche.
alter table public.riders add column if not exists phone text;
alter table public.riders add column if not exists email text;
