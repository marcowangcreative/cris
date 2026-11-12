-- Flowed studio planner
-- Run in the Supabase SQL editor, or with the Supabase CLI, against a new project.
-- The app uses the anon key only. Never put the service-role key in NEXT_PUBLIC_*.
-- Direct table access is limited to the signed-in owner. Share links call the
-- security-definer functions below and cannot read any other event.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  studio_name text not null default 'My studio',
  created_at timestamptz not null default now()
);

create table if not exists public.stylists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  specialty text not null check (specialty in ('hair', 'makeup', 'both')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'complete')),
  couple_name text not null default '',
  venue text not null default '',
  location text not null default '',
  room text not null default '',
  photographer text not null default '',
  videographer text not null default '',
  notes text not null default '',
  is_outdoor boolean not null default false,
  has_extensions boolean not null default false,
  bride_hair int not null default 90,
  bride_makeup int not null default 60,
  default_hair int not null default 45,
  default_makeup int not null default 30,
  buffer_mins int not null default 10,
  bride_touchup_mins int not null default 15,
  pack_state jsonb not null default '{}'::jsonb,
  last_step int not null default 1,
  client_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  timeline_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tokens_differ check (client_token <> timeline_token),
  constraint client_token_len check (char_length(client_token) >= 32),
  constraint timeline_token_len check (char_length(timeline_token) >= 32)
);

create table if not exists public.event_days (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  label text not null default 'Day',
  date date,
  ceremony_time text not null default '',
  ready_by text not null default '',
  call_time text not null default '',
  travel_buffer_mins int not null default 0,
  sort_order int not null default 0
);

create table if not exists public.event_stylists (
  event_id uuid not null references public.events (id) on delete cascade,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  primary key (event_id, stylist_id)
);

create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null default '',
  role text not null default 'bridesmaid',
  services text not null default 'both',
  stylist_id uuid references public.stylists (id) on delete set null,
  notes text not null default '',
  hair_mins int not null default 0,
  makeup_mins int not null default 0,
  price numeric(10, 2) not null default 0,
  inspo_urls text[] not null default '{}',
  day_ids uuid[] not null default '{}',
  day_services jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  constraint member_role check (role in ('bride', 'moh', 'bridesmaid', 'mother_bride', 'mother_groom', 'flower_girl', 'other')),
  constraint member_services check (services in ('hair', 'makeup', 'both'))
);

create index if not exists events_owner_idx on public.events (owner_id);
create index if not exists stylists_owner_idx on public.stylists (owner_id);
create index if not exists event_days_event_idx on public.event_days (event_id);
create index if not exists event_members_event_idx on public.event_members (event_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;
  return value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, studio_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'studio_name', ''), 'My studio'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security. Anon has no policies, so a share token cannot select rows.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.stylists enable row level security;
alter table public.events enable row level security;
alter table public.event_days enable row level security;
alter table public.event_members enable row level security;
alter table public.event_stylists enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "own stylists" on public.stylists;
create policy "own stylists" on public.stylists
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "own events" on public.events;
create policy "own events" on public.events
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "own event days" on public.event_days;
create policy "own event days" on public.event_days
  for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

drop policy if exists "own event members" on public.event_members;
create policy "own event members" on public.event_members
  for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

drop policy if exists "own event stylists" on public.event_stylists;
create policy "own event stylists" on public.event_stylists
  for all to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
    and exists (select 1 from public.stylists s where s.id = stylist_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
    and exists (select 1 from public.stylists s where s.id = stylist_id and s.owner_id = auth.uid())
  );

revoke all on table public.profiles from anon;
revoke all on table public.stylists from anon;
revoke all on table public.events from anon;
revoke all on table public.event_days from anon;
revoke all on table public.event_members from anon;
revoke all on table public.event_stylists from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.stylists to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_days to authenticated;
grant select, insert, update, delete on public.event_members to authenticated;
grant select, insert, update, delete on public.event_stylists to authenticated;

-- ---------------------------------------------------------------------------
-- Owner write: one transaction for the event graph. owner_id is auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.upsert_event(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  eid uuid;
  day jsonb;
  mem jsonb;
  sid uuid;
  i int := 0;
  member_id uuid;
  stylist uuid;
  day_id uuid;
  day_ids uuid[] := '{}';
  services jsonb := '{}'::jsonb;
  token_client text;
  token_timeline text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  eid := coalesce(public.try_uuid(payload->>'id'), gen_random_uuid());
  if exists (select 1 from public.events where id = eid and owner_id <> uid) then
    raise exception 'forbidden';
  end if;

  token_client := nullif(payload->>'clientToken', '');
  token_timeline := nullif(payload->>'timelineToken', '');
  if token_client is null or char_length(token_client) < 32 then
    token_client := encode(gen_random_bytes(24), 'hex');
  end if;
  if token_timeline is null or char_length(token_timeline) < 32 or token_timeline = token_client then
    token_timeline := encode(gen_random_bytes(24), 'hex');
  end if;

  insert into public.events (
    id, owner_id, status, couple_name, venue, location, room, photographer, videographer, notes,
    is_outdoor, has_extensions, bride_hair, bride_makeup, default_hair, default_makeup,
    buffer_mins, bride_touchup_mins, pack_state, last_step, client_token, timeline_token
  )
  values (
    eid,
    uid,
    coalesce(nullif(payload->>'status', ''), 'pending'),
    coalesce(payload->>'coupleName', ''),
    coalesce(payload->>'venue', ''),
    coalesce(payload->>'location', ''),
    coalesce(payload->>'room', ''),
    coalesce(payload->>'photographer', ''),
    coalesce(payload->>'videographer', ''),
    coalesce(payload->>'notes', ''),
    coalesce((payload->>'isOutdoor')::boolean, false),
    coalesce((payload->>'hasExtensions')::boolean, false),
    coalesce((payload->>'brideHair')::int, 90),
    coalesce((payload->>'brideMakeup')::int, 60),
    coalesce((payload->>'defaultHair')::int, 45),
    coalesce((payload->>'defaultMakeup')::int, 30),
    coalesce((payload->>'bufferMins')::int, 10),
    coalesce((payload->>'brideTouchupMins')::int, 15),
    coalesce(payload->'packState', '{}'::jsonb),
    coalesce((payload->>'lastStep')::int, 1),
    token_client,
    token_timeline
  )
  on conflict (id) do update set
    status = excluded.status,
    couple_name = excluded.couple_name,
    venue = excluded.venue,
    location = excluded.location,
    room = excluded.room,
    photographer = excluded.photographer,
    videographer = excluded.videographer,
    notes = excluded.notes,
    is_outdoor = excluded.is_outdoor,
    has_extensions = excluded.has_extensions,
    bride_hair = excluded.bride_hair,
    bride_makeup = excluded.bride_makeup,
    default_hair = excluded.default_hair,
    default_makeup = excluded.default_makeup,
    buffer_mins = excluded.buffer_mins,
    bride_touchup_mins = excluded.bride_touchup_mins,
    pack_state = excluded.pack_state,
    last_step = excluded.last_step;
    -- Tokens stay as they were issued. Rotating them would invalidate links already sent.

  delete from public.event_days where event_id = eid;
  delete from public.event_members where event_id = eid;
  delete from public.event_stylists where event_id = eid;

  i := 0;
  for day in select value from jsonb_array_elements(coalesce(payload->'days', '[]'::jsonb))
  loop
    insert into public.event_days (id, event_id, label, date, ceremony_time, ready_by, call_time, travel_buffer_mins, sort_order)
    values (
      coalesce(public.try_uuid(day->>'id'), gen_random_uuid()),
      eid,
      coalesce(nullif(day->>'label', ''), 'Day'),
      nullif(day->>'date', '')::date,
      coalesce(day->>'ceremonyTime', ''),
      coalesce(day->>'readyBy', ''),
      coalesce(day->>'callTime', ''),
      coalesce((day->>'travelBufferMins')::int, 0),
      i
    );
    i := i + 1;
  end loop;

  for sid in
    select public.try_uuid(value) from jsonb_array_elements_text(coalesce(payload->'stylistIds', '[]'::jsonb))
  loop
    if sid is not null and exists (select 1 from public.stylists where id = sid and owner_id = uid) then
      insert into public.event_stylists (event_id, stylist_id) values (eid, sid) on conflict do nothing;
    end if;
  end loop;

  i := 0;
  for mem in select value from jsonb_array_elements(coalesce(payload->'members', '[]'::jsonb))
  loop
    member_id := coalesce(public.try_uuid(mem->>'id'), gen_random_uuid());
    stylist := public.try_uuid(mem->>'stylistId');
    if stylist is null or not exists (select 1 from public.event_stylists es where es.event_id = eid and es.stylist_id = stylist) then
      stylist := null;
    end if;

    day_ids := '{}';
    for day_id in
      select public.try_uuid(value) from jsonb_array_elements_text(coalesce(mem->'dayIds', '[]'::jsonb))
    loop
      if day_id is not null and exists (select 1 from public.event_days d where d.id = day_id and d.event_id = eid) then
        day_ids := array_append(day_ids, day_id);
      end if;
    end loop;

    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into services
    from jsonb_each_text(coalesce(mem->'dayServices', '{}'::jsonb))
    where public.try_uuid(key) is not null
      and exists (select 1 from public.event_days d where d.id = public.try_uuid(key) and d.event_id = eid)
      and value in ('hair', 'makeup', 'both');

    insert into public.event_members (
      id, event_id, name, role, services, stylist_id, notes, hair_mins, makeup_mins, price,
      inspo_urls, day_ids, day_services, sort_order
    )
    values (
      member_id,
      eid,
      left(coalesce(mem->>'name', ''), 120),
      case when coalesce(mem->>'role', '') in ('bride', 'moh', 'bridesmaid', 'mother_bride', 'mother_groom', 'flower_girl', 'other')
        then mem->>'role' else 'other' end,
      case when coalesce(mem->>'services', '') in ('hair', 'makeup', 'both') then mem->>'services' else 'both' end,
      stylist,
      left(coalesce(mem->>'notes', ''), 2000),
      coalesce((mem->>'hairMins')::int, 0),
      coalesce((mem->>'makeupMins')::int, 0),
      coalesce((mem->>'price')::numeric, 0),
      coalesce(
        (select coalesce(array_agg(u), '{}') from (
          select left(value, 2000) as u
          from jsonb_array_elements_text(coalesce(mem->'urls', '[]'::jsonb))
          where value ~* '^https?://'
          limit 12
        ) s),
        '{}'
      ),
      day_ids,
      services,
      i
    );
    i := i + 1;
    if i >= 80 then
      exit;
    end if;
  end loop;

  return eid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Share links. Each function loads a single event by its own token.
-- ---------------------------------------------------------------------------

create or replace function public.client_get_event(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  ev public.events%rowtype;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;
  select * into ev from public.events where client_token = p_token;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'coupleName', ev.couple_name,
    'venue', ev.venue,
    'location', ev.location,
    'room', ev.room,
    'notes', ev.notes,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'label', d.label, 'date', d.date, 'readyBy', d.ready_by, 'ceremonyTime', d.ceremony_time
      ) order by d.sort_order)
      from public.event_days d where d.event_id = ev.id
    ), '[]'::jsonb),
    'stylists', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'specialty', s.specialty) order by s.name)
      from public.event_stylists es
      join public.stylists s on s.id = es.stylist_id
      where es.event_id = ev.id
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'role', m.role,
        'services', m.services,
        'stylistId', coalesce(m.stylist_id::text, ''),
        'notes', m.notes,
        'urls', to_jsonb(m.inspo_urls),
        'dayIds', to_jsonb(m.day_ids),
        'dayServices', m.day_services
      ) order by m.sort_order)
      from public.event_members m where m.event_id = ev.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.client_save_party(p_token text, p_members jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
  mem jsonb;
  i int := 0;
  member_id uuid;
  existing public.event_members%rowtype;
  has_existing boolean := false;
  stylist uuid;
  day_id uuid;
  day_ids uuid[] := '{}';
  services jsonb := '{}'::jsonb;
  keep uuid[] := '{}';
begin
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'not found';
  end if;
  select * into ev from public.events where client_token = p_token;
  if not found then
    raise exception 'not found';
  end if;
  if jsonb_typeof(p_members) <> 'array' then
    raise exception 'members must be a list';
  end if;

  for mem in select value from jsonb_array_elements(p_members)
  loop
    exit when i >= 80;
    member_id := public.try_uuid(mem->>'id');
    has_existing := false;
    if member_id is not null then
      select * into existing from public.event_members where id = member_id and event_id = ev.id;
      has_existing := found;
      if not has_existing then
        member_id := gen_random_uuid();
      end if;
    else
      member_id := gen_random_uuid();
    end if;

    stylist := public.try_uuid(mem->>'stylistId');
    if stylist is null or not exists (
      select 1 from public.event_stylists es where es.event_id = ev.id and es.stylist_id = stylist
    ) then
      stylist := null;
    end if;

    day_ids := '{}';
    for day_id in
      select public.try_uuid(value) from jsonb_array_elements_text(coalesce(mem->'dayIds', '[]'::jsonb))
    loop
      if day_id is not null and exists (select 1 from public.event_days d where d.id = day_id and d.event_id = ev.id) then
        day_ids := array_append(day_ids, day_id);
      end if;
    end loop;

    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into services
    from jsonb_each_text(coalesce(mem->'dayServices', '{}'::jsonb))
    where public.try_uuid(key) is not null
      and exists (select 1 from public.event_days d where d.id = public.try_uuid(key) and d.event_id = ev.id)
      and value in ('hair', 'makeup', 'both');

    insert into public.event_members (
      id, event_id, name, role, services, stylist_id, notes, hair_mins, makeup_mins, price,
      inspo_urls, day_ids, day_services, sort_order
    )
    values (
      member_id,
      ev.id,
      left(coalesce(mem->>'name', ''), 120),
      case when coalesce(mem->>'role', '') in ('bride', 'moh', 'bridesmaid', 'mother_bride', 'mother_groom', 'flower_girl', 'other')
        then mem->>'role' else 'other' end,
      case when coalesce(mem->>'services', '') in ('hair', 'makeup', 'both') then mem->>'services' else 'both' end,
      stylist,
      left(coalesce(mem->>'notes', ''), 2000),
      case when has_existing then existing.hair_mins else 0 end,
      case when has_existing then existing.makeup_mins else 0 end,
      case when has_existing then existing.price else 0 end,
      coalesce(
        (select coalesce(array_agg(u), '{}') from (
          select left(value, 2000) as u
          from jsonb_array_elements_text(coalesce(mem->'urls', '[]'::jsonb))
          where value ~* '^https?://'
          limit 12
        ) s),
        '{}'
      ),
      day_ids,
      services,
      i
    )
    on conflict (id) do update set
      name = excluded.name,
      role = excluded.role,
      services = excluded.services,
      stylist_id = excluded.stylist_id,
      notes = excluded.notes,
      inspo_urls = excluded.inspo_urls,
      day_ids = excluded.day_ids,
      day_services = excluded.day_services,
      sort_order = excluded.sort_order,
      hair_mins = public.event_members.hair_mins,
      makeup_mins = public.event_members.makeup_mins,
      price = public.event_members.price;

    keep := array_append(keep, member_id);
    i := i + 1;
  end loop;

  delete from public.event_members
  where event_id = ev.id
    and not (id = any(keep));
end;
$$;

create or replace function public.timeline_get_event(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  ev public.events%rowtype;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;
  select * into ev from public.events where timeline_token = p_token;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'coupleName', ev.couple_name,
    'venue', ev.venue,
    'location', ev.location,
    'room', ev.room,
    'notes', ev.notes,
    'photographer', ev.photographer,
    'videographer', ev.videographer,
    'brideHair', ev.bride_hair,
    'brideMakeup', ev.bride_makeup,
    'defaultHair', ev.default_hair,
    'defaultMakeup', ev.default_makeup,
    'bufferMins', ev.buffer_mins,
    'brideTouchupMins', ev.bride_touchup_mins,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'label', d.label,
        'date', d.date,
        'ceremonyTime', d.ceremony_time,
        'readyBy', d.ready_by,
        'callTime', d.call_time,
        'travelBufferMins', d.travel_buffer_mins
      ) order by d.sort_order)
      from public.event_days d where d.event_id = ev.id
    ), '[]'::jsonb),
    'stylists', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'specialty', s.specialty) order by s.name)
      from public.event_stylists es
      join public.stylists s on s.id = es.stylist_id
      where es.event_id = ev.id
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'role', m.role,
        'services', m.services,
        'stylistId', coalesce(m.stylist_id::text, ''),
        'notes', m.notes,
        'hairMins', m.hair_mins,
        'makeupMins', m.makeup_mins,
        'price', 0,
        'urls', to_jsonb(m.inspo_urls),
        'dayIds', to_jsonb(m.day_ids),
        'dayServices', m.day_services
      ) order by m.sort_order)
      from public.event_members m where m.event_id = ev.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.try_uuid(text) from public;
revoke all on function public.upsert_event(jsonb) from public;
revoke all on function public.client_get_event(text) from public;
revoke all on function public.client_save_party(text, jsonb) from public;
revoke all on function public.timeline_get_event(text) from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.touch_updated_at() from public;

grant execute on function public.try_uuid(text) to authenticated;
grant execute on function public.upsert_event(jsonb) to authenticated;
grant execute on function public.client_get_event(text) to anon, authenticated;
grant execute on function public.client_save_party(text, jsonb) to anon, authenticated;
grant execute on function public.timeline_get_event(text) to anon, authenticated;
