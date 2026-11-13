-- Jordan Wang studio portal.
-- Money is integer cents. Timestamps are timestamptz (America/Chicago is applied in the app).
-- Card numbers, CVC, and raw card data are never stored. Stripe ids only.
-- Transformation minimum and 10:00 a.m. rules do not apply to wedding rows.

-- gen_random_uuid() is built into Postgres 13+. Supabase also has pgcrypto;
-- this image may not, so the extension is optional.
do $$
begin
  create extension if not exists pgcrypto;
exception
  when others then
    null;
end
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end
$$;

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  kind text not null check (kind in ('transformation', 'wedding')),
  status text not null,
  agreed_total_cents integer check (agreed_total_cents is null or agreed_total_cents >= 0),
  total_approved_at timestamptz,
  calendly_event_uri text,
  calendly_invitee_uri text,
  stripe_reference text,
  boulevard_client_ref text,
  boulevard_order_ref text,
  created_at timestamptz not null default now(),
  constraint transformation_minimum check (
    kind <> 'transformation'
    or agreed_total_cents is null
    or agreed_total_cents >= 120000
  )
);

create table public.release_batches (
  id uuid primary key default gen_random_uuid(),
  target_year integer not null,
  target_month integer not null check (target_month between 1 and 12),
  weekdays integer[] not null,
  release_at timestamptz,
  published_at timestamptz,
  status text not null check (status in ('draft', 'published')),
  checklist jsonb not null,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  client_id uuid not null references public.clients (id),
  kind text not null check (kind = 'transformation'),
  status text not null check (status in ('confirmed', 'pending_payment', 'canceled', 'needs_review')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null,
  calendly_event_uri text,
  calendly_invitee_uri text,
  created_at timestamptz not null default now()
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  status text not null check (status in ('included_unscheduled', 'scheduled', 'completed', 'canceled')),
  provider text check (provider is null or provider in ('zoom', 'teams')),
  duration_minutes integer not null default 30,
  fee_cents integer not null default 0 check (fee_cents = 0),
  scheduled_at timestamptz,
  meeting_url text,
  created_at timestamptz not null default now()
);

create table public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id),
  hair_history text not null,
  chemical_history jsonb not null,
  scalp_notes text not null default '',
  goals text not null,
  submitted_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  client_id uuid not null references public.clients (id),
  kind text not null check (kind in ('current_hair', 'inspiration')),
  storage_path text not null,
  content_type text not null,
  file_name text not null,
  created_at timestamptz not null default now(),
  constraint asset_folder check (storage_path like client_id::text || '/%')
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  version integer not null check (version > 0),
  scope text not null,
  final_price_cents integer check (final_price_cents is null or final_price_cents >= 0),
  estimated_time text not null default '',
  maintenance text not null default '',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  type text not null check (type = 'stripe_reservation_deposit'),
  status text not null check (status in ('succeeded', 'failed', 'pending')),
  amount_cents integer not null check (amount_cents >= 0),
  verification text not null check (verification in ('verified', 'manual')),
  external_ref text,
  calendly_invitee_uri text,
  created_at timestamptz not null default now()
);

create unique index payments_one_succeeded_deposit_per_invitee
  on public.payments (calendly_invitee_uri)
  where status = 'succeeded' and calendly_invitee_uri is not null;

comment on table public.payments is
  'External payment references only. Never store card numbers, CVC, or raw card data. Deposits are not discounts.';

create table public.wedding_details (
  project_id uuid primary key references public.projects (id),
  wedding_date date not null,
  date_confirmed boolean not null,
  venue text not null,
  city text not null,
  getting_ready_location text not null,
  ready_by_time text not null,
  services text not null check (services in ('hair', 'makeup', 'both')),
  party text not null check (party in ('bride_only', 'party')),
  bride_count integer,
  party_count integer,
  full_journey_interest boolean not null,
  other_events text not null default '',
  travel text not null default '',
  investment_range_note text not null default '',
  referral_source text not null default '',
  created_at timestamptz not null default now()
);

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id),
  kind text not null check (kind in ('wedding', 'travel', 'personal', 'hold')),
  status text not null check (status in ('confirmed', 'hold', 'released')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expires_at timestamptz,
  blocks_transformations boolean not null default true,
  internal_label text not null default '',
  created_at timestamptz not null default now()
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  source text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null check (status in ('processed', 'failed')),
  outcome text not null,
  error text,
  project_id uuid references public.projects (id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id),
  appointment_id uuid references public.appointments (id),
  kind text not null check (kind in ('cancellation_review', 'reschedule_review', 'payment_review')),
  status text not null check (status in ('open', 'resolved')),
  detail text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.project_notes is
  'Private stylist notes. No client select policy. Clients must never read this table.';

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  project_id uuid not null references public.projects (id),
  kind text not null check (kind = 'marketing_photo'),
  granted boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (project_id, kind)
);

create or replace function public.is_ten_am_chicago(ts timestamptz)
returns boolean
language sql
stable
as $fn$
  select extract(hour from ts at time zone 'America/Chicago') = 10
     and extract(minute from ts at time zone 'America/Chicago') = 0
     and extract(second from ts at time zone 'America/Chicago') = 0;
$fn$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select c.id from public.clients c where c.auth_user_id = auth.uid();
$fn$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.staff s where s.auth_user_id = auth.uid()
  );
$fn$;

create or replace function public.approve_own_proposal(target uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $fn$
declare
  ts timestamptz := now();
  proj uuid;
  price integer;
  proj_kind text;
begin
  select p.project_id, p.final_price_cents
    into proj, price
  from public.proposals p
  where p.id = target
    and p.approved_at is null
    and p.project_id in (
      select id from public.projects where client_id = public.current_client_id()
    );
  if proj is null then
    raise exception 'not allowed';
  end if;
  update public.proposals set approved_at = ts where id = target;
  select kind into proj_kind from public.projects where id = proj;
  if proj_kind = 'transformation' and price is not null then
    if price < 120000 then
      raise exception 'below transformation minimum';
    end if;
    update public.projects
      set agreed_total_cents = price,
          total_approved_at = ts
      where id = proj;
  end if;
  return ts;
end;
$fn$;

revoke all on function public.current_client_id() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.approve_own_proposal(uuid) from public;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.approve_own_proposal(uuid) to authenticated;
grant execute on function public.is_ten_am_chicago(timestamptz) to authenticated;

grant usage on schema public to anon, authenticated;

alter table public.staff enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.release_batches enable row level security;
alter table public.appointments enable row level security;
alter table public.consultations enable row level security;
alter table public.intake_responses enable row level security;
alter table public.assets enable row level security;
alter table public.proposals enable row level security;
alter table public.payments enable row level security;
alter table public.wedding_details enable row level security;
alter table public.commitments enable row level security;
alter table public.integration_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.tasks enable row level security;
alter table public.project_notes enable row level security;
alter table public.consents enable row level security;

grant select, insert, update, delete on all tables in schema public to authenticated;

create policy staff_admin on public.staff
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy clients_select on public.clients
  for select to authenticated
  using (public.is_admin() or id = public.current_client_id());

create policy clients_admin_write on public.clients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy projects_select on public.projects
  for select to authenticated
  using (public.is_admin() or client_id = public.current_client_id());

create policy projects_admin_write on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy release_admin on public.release_batches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy appointments_select on public.appointments
  for select to authenticated
  using (public.is_admin() or client_id = public.current_client_id());

create policy appointments_admin on public.appointments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy consultations_select on public.consultations
  for select to authenticated
  using (
    public.is_admin()
    or project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy consultations_admin on public.consultations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy intake_select on public.intake_responses
  for select to authenticated
  using (
    public.is_admin()
    or project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy intake_write on public.intake_responses
  for insert to authenticated
  with check (
    project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy intake_update on public.intake_responses
  for update to authenticated
  using (
    project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  )
  with check (
    project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy assets_select on public.assets
  for select to authenticated
  using (public.is_admin() or client_id = public.current_client_id());

create policy assets_insert on public.assets
  for insert to authenticated
  with check (client_id = public.current_client_id());

create policy assets_admin on public.assets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy proposals_select on public.proposals
  for select to authenticated
  using (
    public.is_admin()
    or project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy proposals_admin on public.proposals
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy payments_select on public.payments
  for select to authenticated
  using (
    public.is_admin()
    or project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy payments_admin on public.payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy wedding_select on public.wedding_details
  for select to authenticated
  using (
    public.is_admin()
    or project_id in (
      select id from public.projects where client_id = public.current_client_id()
    )
  );

create policy wedding_admin on public.wedding_details
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy commitments_admin on public.commitments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy integration_admin on public.integration_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_admin on public.audit_events
  for select to authenticated
  using (public.is_admin());

create policy tasks_admin on public.tasks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy notes_admin on public.project_notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy consents_select on public.consents
  for select to authenticated
  using (public.is_admin() or client_id = public.current_client_id());

create policy consents_write on public.consents
  for insert to authenticated
  with check (client_id = public.current_client_id());

create policy consents_update on public.consents
  for update to authenticated
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());
