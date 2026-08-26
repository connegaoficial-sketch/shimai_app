-- Driver notifications (in-app) + push subscription storage (Web Push phase 2)

create table if not exists shimai.driver_notifications (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references shimai.profiles (id) on delete cascade,
  order_id uuid references shimai.orders (id) on delete cascade,
  kind text not null default 'order_assigned',
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists driver_notifications_driver_id_idx
  on shimai.driver_notifications (driver_id, created_at desc);

create table if not exists shimai.driver_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references shimai.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint driver_push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists driver_push_subscriptions_driver_id_idx
  on shimai.driver_push_subscriptions (driver_id);

alter table shimai.driver_notifications enable row level security;
alter table shimai.driver_push_subscriptions enable row level security;

grant select, insert, update, delete on shimai.driver_notifications
  to authenticated, service_role;
grant select, insert, update, delete on shimai.driver_push_subscriptions
  to authenticated, service_role;

drop policy if exists driver_notifications_select_own on shimai.driver_notifications;
create policy driver_notifications_select_own
  on shimai.driver_notifications
  for select
  to authenticated
  using (driver_id = auth.uid());

drop policy if exists driver_notifications_update_own on shimai.driver_notifications;
create policy driver_notifications_update_own
  on shimai.driver_notifications
  for update
  to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

drop policy if exists driver_notifications_service_insert on shimai.driver_notifications;
create policy driver_notifications_service_insert
  on shimai.driver_notifications
  for insert
  to authenticated
  with check (shimai.is_admin());

drop policy if exists driver_push_subscriptions_own on shimai.driver_push_subscriptions;
create policy driver_push_subscriptions_own
  on shimai.driver_push_subscriptions
  for all
  to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'shimai'
      and tablename = 'driver_notifications'
  ) then
    alter publication supabase_realtime add table shimai.driver_notifications;
  end if;
end $$;
