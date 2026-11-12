-- Booth Rent
-- Run once in the Supabase SQL editor after creating the project.
-- Owners sign in with Supabase Auth (magic link). There is no shared admin password.
-- Row level security isolates each salon to its owner (auth.uid()).
-- The service role bypasses RLS and is used only by the Stripe webhook.
-- stripe_account_id is reserved for a future Stripe Connect integration.

create extension if not exists pgcrypto;

create table if not exists public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  stripe_account_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.stylists (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  name text not null,
  email text not null,
  active boolean not null default true,
  billing_model text not null default 'rent_plus_fee',
  weekly_rent numeric(12, 2) not null default 0,
  monthly_rent numeric(12, 2) not null default 0,
  fee_rate numeric(7, 4) not null default 0,
  service_fee_monthly_cap numeric(12, 2),
  minimum_remit numeric(12, 2) not null default 0,
  stripe_customer_id text,
  payment_method_id text,
  payment_method_status text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stylists_billing_model_check check (
    billing_model in ('flat_weekly', 'flat_monthly', 'rent_plus_fee', 'percent_rent')
  ),
  constraint stylists_bank_status_check check (
    payment_method_status in ('none', 'pending', 'verified')
  )
);

create unique index if not exists stylists_salon_email
  on public.stylists (salon_id, lower(email));

create index if not exists stylists_salon on public.stylists (salon_id);
create index if not exists stylists_customer on public.stylists (stripe_customer_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  net_service_revenue numeric(12, 2) not null,
  rent_amount numeric(12, 2) not null,
  service_fee_rate numeric(7, 4) not null default 0,
  service_fee_amount numeric(12, 2) not null,
  total_amount numeric(12, 2) not null,
  billing_model text not null,
  minimum_applied boolean not null default false,
  cap_applied boolean not null default false,
  stripe_invoice_id text,
  stripe_invoice_url text,
  stripe_payment_intent_id text,
  status text not null default 'draft',
  error_message text,
  due_on date,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_status_check check (
    status in ('draft', 'sent', 'processing', 'paid', 'failed', 'void')
  ),
  constraint invoices_billing_model_check check (
    billing_model in ('flat_weekly', 'flat_monthly', 'rent_plus_fee', 'percent_rent')
  )
);

create index if not exists invoices_salon_status on public.invoices (salon_id, status);
create index if not exists invoices_stylist_week on public.invoices (stylist_id, week_end);
create index if not exists invoices_stripe on public.invoices (stripe_invoice_id);
create index if not exists invoices_payment_intent on public.invoices (stripe_payment_intent_id);

-- One live invoice per stylist per week. Failed and voided rows can be replaced.
create unique index if not exists invoices_one_active_week
  on public.invoices (stylist_id, week_start)
  where status in ('draft', 'sent', 'processing', 'paid');

create or replace function public.enforce_invoice_salon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.stylists
    where id = new.stylist_id
      and salon_id = new.salon_id
  ) then
    raise exception 'Invoice salon_id does not match the stylist';
  end if;
  return new;
end;
$$;

create or replace function public.lock_posted_invoice_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'draft' and new.status = 'draft' then
    raise exception 'Posted invoices cannot return to draft';
  end if;

  if old.status <> 'draft' then
    if new.total_amount is distinct from old.total_amount
       or new.rent_amount is distinct from old.rent_amount
       or new.service_fee_amount is distinct from old.service_fee_amount
       or new.net_service_revenue is distinct from old.net_service_revenue
       or new.service_fee_rate is distinct from old.service_fee_rate
       or new.billing_model is distinct from old.billing_model
       or new.minimum_applied is distinct from old.minimum_applied
       or new.cap_applied is distinct from old.cap_applied
       or new.stylist_id is distinct from old.stylist_id
       or new.salon_id is distinct from old.salon_id
       or new.week_start is distinct from old.week_start
       or new.week_end is distinct from old.week_end
    then
      raise exception 'Invoice amounts are locked after the invoice leaves draft';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_enforce_salon on public.invoices;
create trigger invoices_enforce_salon
  before insert or update on public.invoices
  for each row execute function public.enforce_invoice_salon();

drop trigger if exists invoices_lock_amounts on public.invoices;
create trigger invoices_lock_amounts
  before update on public.invoices
  for each row execute function public.lock_posted_invoice_amounts();

revoke all on function public.enforce_invoice_salon() from public;
revoke all on function public.lock_posted_invoice_amounts() from public;
grant execute on function public.enforce_invoice_salon() to authenticated, service_role;
grant execute on function public.lock_posted_invoice_amounts() to authenticated, service_role;

alter table public.salons enable row level security;
alter table public.stylists enable row level security;
alter table public.invoices enable row level security;
alter table public.salons force row level security;
alter table public.stylists force row level security;
alter table public.invoices force row level security;

revoke all on table public.salons from anon;
revoke all on table public.stylists from anon;
revoke all on table public.invoices from anon;

grant select, insert, update on table public.salons to authenticated;
grant select, insert, update on table public.stylists to authenticated;
grant select, insert, update on table public.invoices to authenticated;

-- The Stripe webhook uses the service role, which bypasses RLS but still needs grants.
grant all on table public.salons, public.stylists, public.invoices to service_role;

drop policy if exists salons_select on public.salons;
drop policy if exists salons_insert on public.salons;
drop policy if exists salons_update on public.salons;
create policy salons_select on public.salons
  for select using (owner_id = (select auth.uid()));
create policy salons_insert on public.salons
  for insert with check (owner_id = (select auth.uid()));
create policy salons_update on public.salons
  for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists stylists_select on public.stylists;
drop policy if exists stylists_insert on public.stylists;
drop policy if exists stylists_update on public.stylists;
create policy stylists_select on public.stylists
  for select using (
    exists (
      select 1 from public.salons
      where salons.id = stylists.salon_id
        and salons.owner_id = (select auth.uid())
    )
  );
create policy stylists_insert on public.stylists
  for insert with check (
    exists (
      select 1 from public.salons
      where salons.id = stylists.salon_id
        and salons.owner_id = (select auth.uid())
    )
  );
create policy stylists_update on public.stylists
  for update
  using (
    exists (
      select 1 from public.salons
      where salons.id = stylists.salon_id
        and salons.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.salons
      where salons.id = stylists.salon_id
        and salons.owner_id = (select auth.uid())
    )
  );

drop policy if exists invoices_select on public.invoices;
drop policy if exists invoices_insert on public.invoices;
drop policy if exists invoices_update on public.invoices;
create policy invoices_select on public.invoices
  for select using (
    exists (
      select 1 from public.salons
      where salons.id = invoices.salon_id
        and salons.owner_id = (select auth.uid())
    )
  );
create policy invoices_insert on public.invoices
  for insert with check (
    exists (
      select 1 from public.salons
      where salons.id = invoices.salon_id
        and salons.owner_id = (select auth.uid())
    )
    and status = 'draft'
  );
-- Paid and processing are webhook-only. The service role bypasses RLS.
create policy invoices_update on public.invoices
  for update
  using (
    exists (
      select 1 from public.salons
      where salons.id = invoices.salon_id
        and salons.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.salons
      where salons.id = invoices.salon_id
        and salons.owner_id = (select auth.uid())
    )
    and status in ('draft', 'sent', 'failed', 'void')
  );
