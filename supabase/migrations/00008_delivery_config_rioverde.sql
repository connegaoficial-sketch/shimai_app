-- SHIMAI Dark Kitchen — Rioverde, San Luis Potosí
-- Previous seed used CDMX placeholders; coverage must match the real kitchen.
UPDATE shimai.settings
SET
  value = '{
    "kitchen_coordinates": { "lat": 21.9312, "lng": -99.9966 },
    "zones": [
      { "radius_km": 3, "fee": 30 },
      { "radius_km": 6, "fee": 60 },
      { "radius_km": 10, "fee": 90 }
    ],
    "max_radius_km": 10
  }'::jsonb,
  updated_at = timezone('utc', now())
WHERE key = 'delivery_config';
