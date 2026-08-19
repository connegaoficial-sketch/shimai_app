-- Promotions: public setting + discount fields on orders.

INSERT INTO shimai.settings (key, value)
VALUES ('promos', '{"items":[]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE shimai.orders
  ADD COLUMN IF NOT EXISTS discount numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (discount >= 0),
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_label text,
  ADD COLUMN IF NOT EXISTS promo_type text;

CREATE INDEX IF NOT EXISTS orders_client_phone_idx
  ON shimai.orders (client_phone);

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
      'promos'
    )
    OR shimai.is_admin()
  );
