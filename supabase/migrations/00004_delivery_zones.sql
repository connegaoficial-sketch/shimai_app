-- Circular delivery zones around the Dark Kitchen + persist fee/coords on orders
UPDATE shimai.settings
SET
  value = '{
    "kitchen_coordinates": { "lat": 19.432608, "lng": -99.133209 },
    "zones": [
      { "radius_km": 1, "fee": 30 },
      { "radius_km": 2, "fee": 60 },
      { "radius_km": 3, "fee": 90 }
    ],
    "max_radius_km": 3
  }'::jsonb,
  updated_at = timezone('utc', now())
WHERE key = 'delivery_config';

ALTER TABLE shimai.orders
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (delivery_fee >= 0),
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision,
  ADD COLUMN IF NOT EXISTS delivery_distance_km numeric(10, 3);
