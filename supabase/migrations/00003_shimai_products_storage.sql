-- Public product images for SHIMAI admin menu uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shimai-products',
  'shimai-products',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "shimai_products_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "shimai_products_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "shimai_products_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "shimai_products_admin_delete" ON storage.objects;

CREATE POLICY "shimai_products_admin_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'shimai-products' AND shimai.is_admin());

CREATE POLICY "shimai_products_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'shimai-products' AND shimai.is_admin());

CREATE POLICY "shimai_products_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'shimai-products' AND shimai.is_admin())
  WITH CHECK (bucket_id = 'shimai-products' AND shimai.is_admin());

CREATE POLICY "shimai_products_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'shimai-products' AND shimai.is_admin());
