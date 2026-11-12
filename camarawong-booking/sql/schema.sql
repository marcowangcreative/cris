-- Camara Wong booking store.
-- The app also creates these tables on startup when DATABASE_URL is set.
-- Safe to run more than once.

create table if not exists studio_settings (
  id integer primary key check (id = 1),
  max_events_per_date integer not null check (max_events_per_date between 1 and 4),
  blocked_dates text[] not null default '{}'
);

insert into studio_settings (id, max_events_per_date, blocked_dates)
values (1, 1, '{}')
on conflict (id) do nothing;

create table if not exists bookings (
  id text primary key,
  event_date date not null,
  start_time text not null,
  duration_minutes integer not null,
  status text not null,
  hold_expires_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists bookings_event_date_idx on bookings (event_date);
create index if not exists bookings_status_idx on bookings (status);

create table if not exists inquiries (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
