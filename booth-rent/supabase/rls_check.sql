-- Proves salon isolation against a real Postgres RLS implementation.
-- Run after supabase/rls_harness.sql and supabase/schema.sql.
-- Fixture rows are rolled back.

begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

insert into public.salons (id, owner_id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Alpha'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Beta');

insert into public.stylists (id, salon_id, name, email, billing_model, weekly_rent) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ada', 'ada@alpha.test', 'flat_weekly', 100),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bea', 'bea@beta.test', 'flat_weekly', 100);

insert into public.invoices (
  id, salon_id, stylist_id, week_start, week_end, net_service_revenue,
  rent_amount, service_fee_rate, service_fee_amount, total_amount, billing_model, status
) values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '2026-11-02', '2026-11-08', 0,
  100, 0, 0, 100, 'flat_weekly', 'draft'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

insert into public.stylists (salon_id, name, email, billing_model)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Cora', 'cora@alpha.test', 'flat_weekly');

do $$
declare
  salon_count int;
  stylist_count int;
  invoice_count int;
  salon_name text;
begin
  select count(*) into salon_count from public.salons;
  select count(*) into stylist_count from public.stylists;
  select count(*) into invoice_count from public.invoices;
  select name into salon_name from public.salons;
  if salon_count <> 1 or stylist_count <> 2 or invoice_count <> 1 or salon_name <> 'Alpha' then
    raise exception 'owner A isolation failed (% salons, % stylists, % invoices, %)',
      salon_count, stylist_count, invoice_count, salon_name;
  end if;
end $$;

do $$
begin
  begin
    insert into public.stylists (salon_id, name, email)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Spy', 'spy@beta.test');
    raise exception 'owner A inserted a stylist into salon B';
  exception
    when others then
      if sqlerrm not like '%row-level security%' then
        raise;
      end if;
  end;
end $$;

do $$
begin
  begin
    update public.invoices
      set status = 'paid'
      where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    raise exception 'owner A marked an invoice paid';
  exception
    when others then
      if sqlerrm not like '%row-level security%' then
        raise;
      end if;
  end;
end $$;

update public.invoices
  set status = 'sent', stripe_invoice_id = 'in_test'
  where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

do $$
begin
  begin
    update public.invoices
      set total_amount = 1
      where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    raise exception 'owner A edited a sent invoice amount';
  exception
    when others then
      if sqlerrm <> 'Invoice amounts are locked after the invoice leaves draft' then
        raise;
      end if;
  end;
end $$;

reset role;
set local role service_role;

update public.invoices
  set status = 'paid'
  where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

do $$
declare
  current_status text;
begin
  select status into current_status
  from public.invoices
  where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  if current_status <> 'paid' then
    raise exception 'service role could not mark the invoice paid (status %)', coalesce(current_status, 'missing');
  end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

do $$
declare
  salon_name text;
begin
  select name into salon_name from public.salons;
  if salon_name <> 'Beta' then
    raise exception 'owner B saw % instead of Beta', coalesce(salon_name, 'nothing');
  end if;
end $$;

rollback;
