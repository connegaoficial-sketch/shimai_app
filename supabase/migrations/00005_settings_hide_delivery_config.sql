-- Keep public settings readable; hide delivery_config (kitchen coords) from clients.
DROP POLICY IF EXISTS settings_public_read ON shimai.settings;

CREATE POLICY settings_public_read
  ON shimai.settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key IN ('payment_methods', 'bank_details')
    OR shimai.is_admin()
  );
