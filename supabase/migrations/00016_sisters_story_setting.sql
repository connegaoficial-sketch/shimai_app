-- Editable sisters story (Ane / Imōto / Futari) for the public landing.

INSERT INTO shimai.settings (key, value)
VALUES (
  'sisters_story',
  '{
    "heading": "Cocina de hermanas, menú fácil de elegir",
    "support": "Tres caminos según tu antojo. No hace falta memorizar el menú: elige el que suena a lo que quieres hoy.",
    "sisters": [
      {
        "key": "ane",
        "label": "Ane",
        "subtitle": "La mayor",
        "description": "Cuando se te antoja algo con más cuerpo o picante: empieza por Ane."
      },
      {
        "key": "imoto",
        "label": "Imōto",
        "subtitle": "La menor",
        "description": "Cuando quieres fresco y ligero, sin pensar de más: ve a Imōto."
      },
      {
        "key": "futari",
        "label": "Futari",
        "subtitle": "Juntas",
        "description": "Cuando vas a compartir o no te decides: Futari es el atajo de la casa."
      }
    ]
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
      'ordering_schedule',
      'sisters_story'
    )
    OR shimai.is_admin()
  );
