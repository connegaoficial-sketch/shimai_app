-- Public magic-link tracker: fetch one order snapshot by UUID without service_role.

create or replace function shimai.get_public_tracker(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = shimai, public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'delivery_lat', o.delivery_lat,
    'delivery_lng', o.delivery_lng,
    'driver_id', o.driver_id,
    'driver_name', p.full_name,
    'driver_lat', dl.lat,
    'driver_lng', dl.lng
  )
  into result
  from shimai.orders o
  left join shimai.profiles p on p.id = o.driver_id
  left join shimai.driver_locations dl on dl.order_id = o.id
  where o.id = p_order_id;

  return result;
end;
$$;

revoke all on function shimai.get_public_tracker(uuid) from public;
grant execute on function shimai.get_public_tracker(uuid)
  to anon, authenticated, service_role;
