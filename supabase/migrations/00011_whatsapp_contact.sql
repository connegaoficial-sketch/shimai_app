-- Public WhatsApp contact for landing + transfer confirmations.

INSERT INTO shimai.settings (key, value)
VALUES ('whatsapp_contact', '{"phone":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS settings_public_read ON shimai.settings;

CREATE POLICY settings_public_read
  ON shimai.settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key IN ('payment_methods', 'bank_details', 'whatsapp_contact')
    OR shimai.is_admin()
  );
