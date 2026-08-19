-- Realtime + tracker presence + guest GPS read for magic-link tracker

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'shimai'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table shimai.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'shimai'
      and tablename = 'driver_locations'
  ) then
    alter publication supabase_realtime add table shimai.driver_locations;
  end if;
end $$;

create table if not exists shimai.tracker_presence (
  order_id uuid primary key references shimai.orders (id) on delete cascade,
  status shimai.order_status not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table shimai.tracker_presence enable row level security;

grant select, insert, update, delete on shimai.tracker_presence
  to anon, authenticated, service_role;

drop policy if exists tracker_presence_public_select on shimai.tracker_presence;
create policy tracker_presence_public_select
  on shimai.tracker_presence
  for select
  to anon, authenticated
  using (true);

drop policy if exists tracker_presence_service_write on shimai.tracker_presence;
create policy tracker_presence_service_write
  on shimai.tracker_presence
  for all
  to authenticated
  using (shimai.is_admin() or shimai.is_driver())
  with check (shimai.is_admin() or shimai.is_driver());

create or replace function shimai.sync_tracker_presence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into shimai.tracker_presence (order_id, status, updated_at)
  values (new.id, new.status, timezone('utc', now()))
  on conflict (order_id) do update
    set status = excluded.status,
        updated_at = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists orders_sync_tracker_presence on shimai.orders;
create trigger orders_sync_tracker_presence
  after insert or update of status on shimai.orders
  for each row
  execute function shimai.sync_tracker_presence();

insert into shimai.tracker_presence (order_id, status, updated_at)
select id, status, timezone('utc', now())
from shimai.orders
on conflict (order_id) do update
  set status = excluded.status,
      updated_at = excluded.updated_at;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'shimai'
      and tablename = 'tracker_presence'
  ) then
    alter publication supabase_realtime add table shimai.tracker_presence;
  end if;
end $$;

drop policy if exists driver_locations_anon_active on shimai.driver_locations;
create policy driver_locations_anon_active
  on shimai.driver_locations
  for select
  to anon
  using (
    exists (
      select 1
      from shimai.orders o
      where o.id = order_id
        and o.status in (
          'ready_for_pickup'::shimai.order_status,
          'in_transit'::shimai.order_status
        )
    )
  );

drop policy if exists driver_locations_update_own on shimai.driver_locations;
create policy driver_locations_update_own
  on shimai.driver_locations
  for update
  to authenticated
  using (
    shimai.is_admin()
    or (
      shimai.is_driver()
      and driver_id = auth.uid()
      and exists (
        select 1 from shimai.orders o
        where o.id = order_id and o.driver_id = auth.uid()
      )
    )
  )
  with check (
    shimai.is_admin()
    or (
      shimai.is_driver()
      and driver_id = auth.uid()
      and exists (
        select 1 from shimai.orders o
        where o.id = order_id and o.driver_id = auth.uid()
      )
    )
  );
