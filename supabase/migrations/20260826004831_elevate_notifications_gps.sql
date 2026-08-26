-- Elevate notifications P0–P2: unified table, push queue, prefs, multi-device metadata.
-- Also prepares reliable Realtime for driver/client notification center.

-- ---------------------------------------------------------------------------
-- Unified in-app notifications
-- ---------------------------------------------------------------------------
create table if not exists shimai.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('driver', 'client')),
  recipient_id uuid references shimai.profiles (id) on delete cascade,
  order_id uuid references shimai.orders (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  dedup_key text,
  push_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_audience_recipient_chk check (
    (audience = 'driver' and recipient_id is not null)
    or (audience = 'client' and order_id is not null)
  )
);

create unique index if not exists notifications_dedup_key_uidx
  on shimai.notifications (dedup_key)
  where dedup_key is not null;

create index if not exists notifications_driver_inbox_idx
  on shimai.notifications (recipient_id, created_at desc)
  where audience = 'driver';

create index if not exists notifications_client_order_idx
  on shimai.notifications (order_id, created_at desc)
  where audience = 'client';

create index if not exists notifications_push_pending_idx
  on shimai.notifications (created_at)
  where push_sent_at is null;

-- Migrate legacy rows
insert into shimai.notifications (
  id, audience, recipient_id, order_id, kind, title, body, link, is_read, dedup_key, push_sent_at, created_at
)
select
  id,
  'driver',
  driver_id,
  order_id,
  kind,
  title,
  body,
  case when order_id is not null then '/driver/orders/' || order_id::text else '/driver' end,
  read_at is not null,
  'legacy-driver-' || id::text,
  timezone('utc', now()),
  created_at
from shimai.driver_notifications
on conflict (id) do nothing;

insert into shimai.notifications (
  id, audience, recipient_id, order_id, kind, title, body, link, is_read, dedup_key, push_sent_at, created_at
)
select
  id,
  'client',
  null,
  order_id,
  kind,
  title,
  body,
  '/tracker/' || order_id::text,
  read_at is not null,
  'legacy-client-' || id::text,
  timezone('utc', now()),
  created_at
from shimai.client_notifications
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Preference toggles (P2)
-- ---------------------------------------------------------------------------
create table if not exists shimai.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('driver', 'client')),
  recipient_id uuid references shimai.profiles (id) on delete cascade,
  order_id uuid references shimai.orders (id) on delete cascade,
  kind text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_prefs_scope_chk check (
    (audience = 'driver' and recipient_id is not null and order_id is null)
    or (audience = 'client' and order_id is not null and recipient_id is null)
  )
);

create unique index if not exists notification_prefs_driver_kind_uidx
  on shimai.notification_prefs (recipient_id, kind)
  where audience = 'driver';

create unique index if not exists notification_prefs_client_kind_uidx
  on shimai.notification_prefs (order_id, kind)
  where audience = 'client';

-- ---------------------------------------------------------------------------
-- Push subscriptions: multi-device metadata
-- ---------------------------------------------------------------------------
alter table shimai.driver_push_subscriptions
  add column if not exists user_agent text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table shimai.client_push_subscriptions
  add column if not exists user_agent text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Unique per recipient+endpoint (keep global endpoint unique for cleanup)
create unique index if not exists driver_push_subscriptions_driver_endpoint_uidx
  on shimai.driver_push_subscriptions (driver_id, endpoint);

create unique index if not exists client_push_subscriptions_order_endpoint_uidx
  on shimai.client_push_subscriptions (order_id, endpoint);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table shimai.notifications enable row level security;
alter table shimai.notification_prefs enable row level security;

grant select, insert, update, delete on shimai.notifications
  to anon, authenticated, service_role;
grant select, insert, update, delete on shimai.notification_prefs
  to anon, authenticated, service_role;

drop policy if exists notifications_driver_select on shimai.notifications;
create policy notifications_driver_select
  on shimai.notifications
  for select
  to authenticated
  using (audience = 'driver' and recipient_id = auth.uid());

drop policy if exists notifications_driver_update on shimai.notifications;
create policy notifications_driver_update
  on shimai.notifications
  for update
  to authenticated
  using (audience = 'driver' and recipient_id = auth.uid())
  with check (audience = 'driver' and recipient_id = auth.uid());

drop policy if exists notifications_client_select on shimai.notifications;
create policy notifications_client_select
  on shimai.notifications
  for select
  to anon, authenticated
  using (
    audience = 'client'
    and order_id is not null
    and exists (
      select 1 from shimai.orders o
      where o.id = order_id
        and o.status <> 'cancelled'::shimai.order_status
    )
  );

drop policy if exists notifications_client_update on shimai.notifications;
create policy notifications_client_update
  on shimai.notifications
  for update
  to anon, authenticated
  using (audience = 'client')
  with check (audience = 'client');

drop policy if exists notifications_staff_insert on shimai.notifications;
create policy notifications_staff_insert
  on shimai.notifications
  for insert
  to authenticated
  with check (shimai.is_admin() or shimai.is_driver());

drop policy if exists notification_prefs_driver on shimai.notification_prefs;
create policy notification_prefs_driver
  on shimai.notification_prefs
  for all
  to authenticated
  using (audience = 'driver' and recipient_id = auth.uid())
  with check (audience = 'driver' and recipient_id = auth.uid());

drop policy if exists notification_prefs_client on shimai.notification_prefs;
create policy notification_prefs_client
  on shimai.notification_prefs
  for all
  to anon, authenticated
  using (audience = 'client')
  with check (audience = 'client');

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'shimai'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table shimai.notifications;
  end if;
end $$;

-- Drop legacy in-app tables (data already copied). Push tables stay.
drop table if exists shimai.driver_notifications cascade;
drop table if exists shimai.client_notifications cascade;
