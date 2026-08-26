-- Client notifications + VAPID settings (SHIMAI-only, schema shimai)

create table if not exists shimai.client_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shimai.orders (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_notifications_order_id_idx
  on shimai.client_notifications (order_id, created_at desc);

create table if not exists shimai.client_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shimai.orders (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint client_push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists client_push_subscriptions_order_id_idx
  on shimai.client_push_subscriptions (order_id);

create table if not exists shimai.notification_log (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null,
  order_id uuid references shimai.orders (id) on delete set null,
  recipient_role text not null,
  recipient_id uuid,
  push_sent boolean not null default false,
  in_app_sent boolean not null default false,
  error text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table shimai.client_notifications enable row level security;
alter table shimai.client_push_subscriptions enable row level security;
alter table shimai.notification_log enable row level security;

grant select, insert, update, delete on shimai.client_notifications
  to anon, authenticated, service_role;
grant select, insert, update, delete on shimai.client_push_subscriptions
  to anon, authenticated, service_role;
grant select, insert on shimai.notification_log
  to authenticated, service_role;

-- Tracker magic link: anon can read/write notifications for active orders
drop policy if exists client_notifications_tracker_select on shimai.client_notifications;
create policy client_notifications_tracker_select
  on shimai.client_notifications
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from shimai.orders o
      where o.id = order_id
        and o.status not in ('cancelled'::shimai.order_status)
    )
  );

drop policy if exists client_notifications_service_insert on shimai.client_notifications;
create policy client_notifications_service_insert
  on shimai.client_notifications
  for insert
  to authenticated
  with check (shimai.is_admin() or shimai.is_driver());

drop policy if exists client_push_subscriptions_anon on shimai.client_push_subscriptions;
create policy client_push_subscriptions_anon
  on shimai.client_push_subscriptions
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists notification_log_admin on shimai.notification_log;
create policy notification_log_admin
  on shimai.notification_log
  for select
  to authenticated
  using (shimai.is_admin());

drop policy if exists notification_log_insert on shimai.notification_log;
create policy notification_log_insert
  on shimai.notification_log
  for insert
  to authenticated
  with check (shimai.is_admin() or shimai.is_driver());

-- VAPID keys placeholder (admin fills via settings UI or SQL)
insert into shimai.settings (key, value)
values (
  'web_push_vapid',
  '{"public_key":"","private_key":"","subject":"mailto:hello@shimai.mx"}'::jsonb
)
on conflict (key) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'shimai'
      and tablename = 'client_notifications'
  ) then
    alter publication supabase_realtime add table shimai.client_notifications;
  end if;
end $$;
