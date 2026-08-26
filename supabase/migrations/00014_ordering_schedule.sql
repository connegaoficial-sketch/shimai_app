-- Ordering schedule: closed weekdays (rest day) + optional force close.
-- Weekday: 0 = domingo … 6 = sábado (JS getDay / America/Mexico_City).

INSERT INTO shimai.settings (key, value)
VALUES (
  'ordering_schedule',
  '{
    "timezone": "America/Mexico_City",
    "closed_weekdays": [2],
    "force_closed": false
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS settings_public_read ON shimai.settings;

CREATE POLICY settings_public_read
  ON shimai.settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key IN (
      'payment_methods',
      'bank_details',
      'whatsapp_contact',
      'promos',
      'ordering_schedule'
    )
    OR shimai.is_admin()
  );
