-- Public delivery quote without exposing kitchen coordinates to the Data API.
-- Checkout quotes must use settings.delivery_config (fee 0 stays 0), not app fallbacks.

create or replace function shimai.haversine_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

revoke all on function shimai.haversine_km(double precision, double precision, double precision, double precision) from public;

create or replace function shimai.quote_delivery_fee(
  p_lat double precision,
  p_lng double precision
)
returns jsonb
language plpgsql
stable
security definer
set search_path = shimai, public
as $$
declare
  cfg jsonb;
  kitchen jsonb;
  zones jsonb;
  max_r double precision;
  dist double precision;
  zone jsonb;
  fee numeric;
begin
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_COORDS',
      'error', 'Selecciona una dirección válida en el mapa.'
    );
  end if;

  select value into cfg
  from shimai.settings
  where key = 'delivery_config';

  if cfg is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_CONFIG',
      'error', 'Configuración de envío incompleta.'
    );
  end if;

  kitchen := cfg -> 'kitchen_coordinates';
  zones := cfg -> 'zones';
  max_r := coalesce((cfg ->> 'max_radius_km')::double precision, 0);

  if kitchen is null
     or jsonb_typeof(zones) is distinct from 'array'
     or jsonb_array_length(zones) = 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_CONFIG',
      'error', 'Configuración de envío incompleta.'
    );
  end if;

  dist := shimai.haversine_km(
    (kitchen ->> 'lat')::double precision,
    (kitchen ->> 'lng')::double precision,
    p_lat,
    p_lng
  );

  if max_r > 0 and dist > max_r then
    return jsonb_build_object(
      'ok', false,
      'code', 'OUT_OF_COVERAGE',
      'error', 'Lo sentimos, tu dirección está fuera de nuestra zona de cobertura'
    );
  end if;

  select z
  into zone
  from jsonb_array_elements(zones) as z
  where coalesce((z ->> 'radius_km')::double precision, 0) >= dist
  order by (z ->> 'radius_km')::double precision asc
  limit 1;

  if zone is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'OUT_OF_COVERAGE',
      'error', 'Lo sentimos, tu dirección está fuera de nuestra zona de cobertura'
    );
  end if;

  fee := coalesce((zone ->> 'fee')::numeric, 0);
  if fee < 0 then
    fee := 0;
  end if;

  return jsonb_build_object(
    'ok', true,
    'delivery_fee', fee
  );
end;
$$;

revoke all on function shimai.quote_delivery_fee(double precision, double precision) from public;
grant execute on function shimai.quote_delivery_fee(double precision, double precision)
  to anon, authenticated, service_role;

create or replace function shimai.delivery_public_geo()
returns jsonb
language plpgsql
stable
security definer
set search_path = shimai, public
as $$
declare
  cfg jsonb;
  kitchen jsonb;
  max_r double precision;
begin
  select value into cfg
  from shimai.settings
  where key = 'delivery_config';

  if cfg is null then
    return null;
  end if;

  kitchen := cfg -> 'kitchen_coordinates';
  max_r := coalesce((cfg ->> 'max_radius_km')::double precision, 10);

  if kitchen is null then
    return null;
  end if;

  return jsonb_build_object(
    'lat', (kitchen ->> 'lat')::double precision,
    'lng', (kitchen ->> 'lng')::double precision,
    'max_radius_km', max_r
  );
end;
$$;

revoke all on function shimai.delivery_public_geo() from public;
grant execute on function shimai.delivery_public_geo()
  to anon, authenticated, service_role;
