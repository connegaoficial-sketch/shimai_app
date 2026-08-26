-- Sushi composition fields for aligned product cards.
-- Non-sushi keeps freeform description; sushi uses filling (dentro) + topping (fuera).

ALTER TABLE shimai.products
  ADD COLUMN IF NOT EXISTS is_sushi boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS filling text,
  ADD COLUMN IF NOT EXISTS topping text;

COMMENT ON COLUMN shimai.products.is_sushi IS
  'When true, public cards show filling/topping instead of a long description.';
COMMENT ON COLUMN shimai.products.filling IS
  'Sushi: por dentro / relleno';
COMMENT ON COLUMN shimai.products.topping IS
  'Sushi: por fuera / topping';
