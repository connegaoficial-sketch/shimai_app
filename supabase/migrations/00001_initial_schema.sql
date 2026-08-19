-- =============================================================================
-- SHIMAI SUSHI HOUSE — initial schema
-- Project: multi-app shared Supabase (ikxbuqebgbeciznedgkj)
--
-- CRITICAL: This app lives in its own schema `shimai`, following the platform
-- pattern used by sabore / freezy / foodcore / hospitality. Do NOT place
-- SHIMAI tables in `public` (shared) or other app schemas.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS shimai;

-- -----------------------------------------------------------------------------
-- Enums (schema-scoped — avoids collisions with other apps)
-- -----------------------------------------------------------------------------

CREATE TYPE shimai.user_role AS ENUM ('client', 'admin', 'driver');

CREATE TYPE shimai.order_status AS ENUM (
  'pending_payment',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'cancelled'
);

CREATE TYPE shimai.payment_method AS ENUM (
  'card_online',
  'cash',
  'bank_transfer',
  'card_terminal'
);

CREATE TYPE shimai.payment_status AS ENUM (
  'pending',
  'awaiting_proof',
  'paid',
  'failed',
  'refunded'
);

-- -----------------------------------------------------------------------------
-- Tables (created before helpers that reference them)
-- -----------------------------------------------------------------------------

CREATE TABLE shimai.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role shimai.user_role NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE shimai.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE shimai.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES shimai.categories (id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  is_signature boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX products_category_id_idx ON shimai.products (category_id);

CREATE TABLE shimai.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Seed dynamic config (zero hardcode in the frontend)
INSERT INTO shimai.settings (key, value) VALUES
  (
    'bank_details',
    '{"bank_name":"","clabe":"","account_number":"","holder_name":""}'::jsonb
  ),
  (
    'payment_methods',
    '{"card_online":true,"cash":true,"bank_transfer":true,"card_terminal":true}'::jsonb
  ),
  (
    'delivery_config',
    '{"base_fee":0,"free_delivery_minimum":0}'::jsonb
  );

CREATE TABLE shimai.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES shimai.profiles (id) ON DELETE SET NULL,
  -- Required so drivers can be scoped via RLS ("asignadas")
  driver_id uuid REFERENCES shimai.profiles (id) ON DELETE SET NULL,
  status shimai.order_status NOT NULL DEFAULT 'pending_payment',
  payment_method shimai.payment_method NOT NULL,
  payment_status shimai.payment_status NOT NULL DEFAULT 'pending',
  -- Authoritative total: computed only by backend / Edge Functions
  total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  delivery_address jsonb,
  delivery_notes text,
  client_phone text,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX orders_client_id_idx ON shimai.orders (client_id);
CREATE INDEX orders_driver_id_idx ON shimai.orders (driver_id);
CREATE INDEX orders_status_idx ON shimai.orders (status);
CREATE INDEX orders_created_at_idx ON shimai.orders (created_at DESC);

CREATE TABLE shimai.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES shimai.orders (id) ON DELETE CASCADE,
  product_id uuid REFERENCES shimai.products (id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  -- Price snapshot at purchase time (never re-read live product price for billing)
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX order_items_order_id_idx ON shimai.order_items (order_id);
CREATE INDEX order_items_product_id_idx ON shimai.order_items (product_id);

CREATE TABLE shimai.driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES shimai.profiles (id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES shimai.orders (id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT driver_locations_order_unique UNIQUE (order_id)
);

CREATE INDEX driver_locations_driver_id_idx ON shimai.driver_locations (driver_id);

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, locked search_path)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION shimai.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shimai.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::shimai.user_role
  );
$$;

CREATE OR REPLACE FUNCTION shimai.is_driver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shimai.profiles
    WHERE id = auth.uid()
      AND role = 'driver'::shimai.user_role
  );
$$;

CREATE OR REPLACE FUNCTION shimai.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT shimai.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change profile roles';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION shimai.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_role
  BEFORE UPDATE ON shimai.profiles
  FOR EACH ROW
  EXECUTE FUNCTION shimai.protect_profile_role();

CREATE TRIGGER settings_set_updated_at
  BEFORE UPDATE ON shimai.settings
  FOR EACH ROW
  EXECUTE FUNCTION shimai.set_updated_at();

CREATE TRIGGER driver_locations_set_updated_at
  BEFORE UPDATE ON shimai.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION shimai.set_updated_at();

-- -----------------------------------------------------------------------------
-- Grants (mirror sabore / freezy / foodcore exposure pattern)
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA shimai TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA shimai
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA shimai
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION shimai.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION shimai.is_driver() TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA shimai
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA shimai
  GRANT USAGE, SELECT ON SEQUENCES
  TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- NOTE: RLS is enabled on ALL tables, including settings.
-- settings is public-read / admin-write (not "no RLS").
-- -----------------------------------------------------------------------------

ALTER TABLE shimai.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shimai.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shimai.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shimai.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shimai.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shimai.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shimai.driver_locations ENABLE ROW LEVEL SECURITY;

-- profiles ------------------------------------------------------------------

CREATE POLICY profiles_select_own_or_admin
  ON shimai.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR shimai.is_admin());

CREATE POLICY profiles_insert_own
  ON shimai.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own_or_admin
  ON shimai.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR shimai.is_admin())
  WITH CHECK (id = auth.uid() OR shimai.is_admin());

CREATE POLICY profiles_admin_delete
  ON shimai.profiles
  FOR DELETE
  TO authenticated
  USING (shimai.is_admin());

-- categories ----------------------------------------------------------------

CREATE POLICY categories_public_read
  ON shimai.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY categories_admin_insert
  ON shimai.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (shimai.is_admin());

CREATE POLICY categories_admin_update
  ON shimai.categories
  FOR UPDATE
  TO authenticated
  USING (shimai.is_admin())
  WITH CHECK (shimai.is_admin());

CREATE POLICY categories_admin_delete
  ON shimai.categories
  FOR DELETE
  TO authenticated
  USING (shimai.is_admin());

-- products ------------------------------------------------------------------

CREATE POLICY products_public_read
  ON shimai.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY products_admin_insert
  ON shimai.products
  FOR INSERT
  TO authenticated
  WITH CHECK (shimai.is_admin());

CREATE POLICY products_admin_update
  ON shimai.products
  FOR UPDATE
  TO authenticated
  USING (shimai.is_admin())
  WITH CHECK (shimai.is_admin());

CREATE POLICY products_admin_delete
  ON shimai.products
  FOR DELETE
  TO authenticated
  USING (shimai.is_admin());

-- settings (public read, admin write) ---------------------------------------

CREATE POLICY settings_public_read
  ON shimai.settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY settings_admin_insert
  ON shimai.settings
  FOR INSERT
  TO authenticated
  WITH CHECK (shimai.is_admin());

CREATE POLICY settings_admin_update
  ON shimai.settings
  FOR UPDATE
  TO authenticated
  USING (shimai.is_admin())
  WITH CHECK (shimai.is_admin());

CREATE POLICY settings_admin_delete
  ON shimai.settings
  FOR DELETE
  TO authenticated
  USING (shimai.is_admin());

-- orders --------------------------------------------------------------------

CREATE POLICY orders_select_own_assigned_or_admin
  ON shimai.orders
  FOR SELECT
  TO authenticated
  USING (
    shimai.is_admin()
    OR client_id = auth.uid()
    OR (shimai.is_driver() AND driver_id = auth.uid())
  );

-- Guest/authenticated order creation; totals MUST be set by backend later
CREATE POLICY orders_insert_client_or_guest
  ON shimai.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    client_id IS NULL
    OR client_id = auth.uid()
    OR shimai.is_admin()
  );

CREATE POLICY orders_update_admin_or_assigned_driver
  ON shimai.orders
  FOR UPDATE
  TO authenticated
  USING (
    shimai.is_admin()
    OR (shimai.is_driver() AND driver_id = auth.uid())
    OR client_id = auth.uid()
  )
  WITH CHECK (
    shimai.is_admin()
    OR (shimai.is_driver() AND driver_id = auth.uid())
    OR client_id = auth.uid()
  );

CREATE POLICY orders_admin_delete
  ON shimai.orders
  FOR DELETE
  TO authenticated
  USING (shimai.is_admin());

-- order_items (inherits access from parent order) ---------------------------

CREATE POLICY order_items_select_via_order
  ON shimai.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM shimai.orders o
      WHERE o.id = order_id
        AND (
          shimai.is_admin()
          OR o.client_id = auth.uid()
          OR (shimai.is_driver() AND o.driver_id = auth.uid())
        )
    )
  );

CREATE POLICY order_items_insert_via_order
  ON shimai.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM shimai.orders o
      WHERE o.id = order_id
        AND (
          shimai.is_admin()
          OR o.client_id IS NULL
          OR o.client_id = auth.uid()
        )
    )
  );

CREATE POLICY order_items_admin_update
  ON shimai.order_items
  FOR UPDATE
  TO authenticated
  USING (shimai.is_admin())
  WITH CHECK (shimai.is_admin());

CREATE POLICY order_items_admin_delete
  ON shimai.order_items
  FOR DELETE
  TO authenticated
  USING (shimai.is_admin());

-- driver_locations ----------------------------------------------------------

CREATE POLICY driver_locations_select_client_admin_or_own
  ON shimai.driver_locations
  FOR SELECT
  TO authenticated
  USING (
    shimai.is_admin()
    OR driver_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM shimai.orders o
      WHERE o.id = order_id
        AND o.client_id = auth.uid()
        AND o.status IN (
          'confirmed'::shimai.order_status,
          'preparing'::shimai.order_status,
          'ready_for_pickup'::shimai.order_status,
          'in_transit'::shimai.order_status
        )
    )
  );

CREATE POLICY driver_locations_insert_own
  ON shimai.driver_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shimai.is_admin()
    OR (
      shimai.is_driver()
      AND driver_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM shimai.orders o
        WHERE o.id = order_id
          AND o.driver_id = auth.uid()
      )
    )
  );

CREATE POLICY driver_locations_update_own
  ON shimai.driver_locations
  FOR UPDATE
  TO authenticated
  USING (
    shimai.is_admin()
    OR (shimai.is_driver() AND driver_id = auth.uid())
  )
  WITH CHECK (
    shimai.is_admin()
    OR (shimai.is_driver() AND driver_id = auth.uid())
  );

CREATE POLICY driver_locations_admin_delete
  ON shimai.driver_locations
  FOR DELETE
  TO authenticated
  USING (shimai.is_admin());
