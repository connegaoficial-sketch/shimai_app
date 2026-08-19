-- =============================================================================
-- SHIMAI SUSHI HOUSE — brand seed (categories + sample products)
-- Schema: shimai (multi-tenant isolated)
-- Idempotent via ON CONFLICT on categories.slug and product name+category.
-- =============================================================================

INSERT INTO shimai.categories (name, slug, description, is_active, sort_order)
VALUES
  ('Ane', 'ane', 'Sabores intensos. La hermana mayor.', true, 1),
  ('Imōto', 'imoto', 'Sabores frescos. La hermana menor.', true, 2),
  ('Futari', 'futari', 'La combinación perfecta. Creado entre las dos.', true, 3),
  ('Sakura Sweets', 'sakura-sweets', 'Postres delicados.', true, 4),
  ('Shimai Drinks', 'shimai-drinks', 'Bebidas de la casa.', true, 5)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Products keyed by (category_id, name) via unique partial approach:
-- delete+insert for seed SKUs only would be destructive; use NOT EXISTS guard.

WITH cat AS (
  SELECT id, slug FROM shimai.categories
),
seed (category_slug, name, description, price, is_signature, is_available, sort_order) AS (
  VALUES
    -- Ane
    ('ane', 'Ane Spicy Tuna', 'Atún spicy, chipotle y togarashi. Firma de la hermana mayor.', 185.00, true, true, 1),
    ('ane', 'Dragon Fire Roll', 'Camarón tempura, eel sauce ahumada y chile seco.', 210.00, false, true, 2),
    ('ane', 'Crispy Unagi Bowl', 'Unagi crujiente sobre arroz sushi con salsa tare.', 195.00, false, true, 3),
    ('ane', 'Ane Dynamite Nigiri', 'Nigiri de salmón flameado con miso caramelo.', 160.00, true, true, 4),

    -- Imōto
    ('imoto', 'Imōto Citrus Salmon', 'Salmón, yuzu, pepino y cebollín. Fresca y limpia.', 175.00, true, true, 1),
    ('imoto', 'Avocado Cucumber Fresh', 'Aguacate, pepino, ajonjolí y wasabi suave.', 145.00, false, true, 2),
    ('imoto', 'Maguro Tiradito', 'Atún en láminas con leche de tigre ligera.', 190.00, false, true, 3),
    ('imoto', 'Imōto Garden Roll', 'Vegetales de temporada, edamame y ponzu.', 155.00, false, true, 4),

    -- Futari
    ('futari', 'Futari Perfect Pair', 'Plato compartido: spicy tuna + citrus salmon.', 320.00, true, true, 1),
    ('futari', 'Twin Tempura Rolls', 'Dos rolls tempura contrastados, salsa dual.', 220.00, false, true, 2),
    ('futari', 'Duo Miso Comfort', 'Caldo miso profundo con toppings de ambas hermanas.', 165.00, false, true, 3),
    ('futari', 'Futari Signature Platter', 'Selección premium para dos. SHIMAI SIGNATURE.', 450.00, true, true, 4),

    -- Sakura Sweets
    ('sakura-sweets', 'Sakura Mochi Duo', 'Mochi de sakura y matcha, relleno cremoso.', 95.00, false, true, 1),
    ('sakura-sweets', 'Matcha Cheesecake', 'Cheesecake ligero con polvo de matcha ceremonial.', 110.00, true, true, 2),
    ('sakura-sweets', 'Yuzu Tart', 'Tarta cítrica de yuzu con merengue suave.', 105.00, false, true, 3),

    -- Shimai Drinks
    ('shimai-drinks', 'Shimai House Matcha', 'Matcha batido al estilo de la casa.', 75.00, true, true, 1),
    ('shimai-drinks', 'Yuzu Sparkling', 'Refresco de yuzu con gas fino.', 65.00, false, true, 2),
    ('shimai-drinks', 'Sakura Lemonade', 'Limonada rosa con esencia de sakura.', 60.00, false, true, 3),
    ('shimai-drinks', 'Horchata Matcha', 'Horchata artesanal con toque de matcha.', 70.00, false, true, 4)
)
INSERT INTO shimai.products (
  category_id,
  name,
  description,
  price,
  is_signature,
  is_available,
  sort_order
)
SELECT
  c.id,
  s.name,
  s.description,
  s.price::numeric(12, 2),
  s.is_signature,
  s.is_available,
  s.sort_order
FROM seed s
JOIN cat c ON c.slug = s.category_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM shimai.products p
  WHERE p.category_id = c.id
    AND p.name = s.name
);
