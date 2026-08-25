# Pendiente: reseñas SHIMAI

Idea acordada, **aún no implementada**. Abrir este archivo cuando se decida si las reseñas viven en la app, en Google Maps, o en ambos.

---

## Decisión abierta (antes de codear)

Hay tres caminos. No se pueden mezclar como si fueran el mismo producto.

### A. Reseña en SHIMAI (portal propio)

WhatsApp → formulario en la app → admin aprueba → se muestra en la landing.

- Control de tono, marca y qué se publica.
- No suma estrellas en Google Maps ni en búsquedas “SHIMAI Rioverde”.
- El cliente no necesita cuenta de Google.

### B. Reseña solo en Google Maps

WhatsApp → link directo a “Escribir reseña” del perfil de Google Business.

- Sirve para Maps, SEO local y confianza de quien busca el local.
- No hay aprobación en admin: Google publica (o no) según sus reglas.
- El cliente **tiene que estar logueado en Google**.
- En la landing no aparece nada nuestro, salvo que después **leamos** las reseñas de Google (ver más abajo).

### C. Los dos (recomendado si se quiere Maps + casa)

El mensaje de WhatsApp invita a **una** acción principal, no a dos formularios.

Opción más limpia:

1. Formulario corto en SHIMAI (comida + entrega + texto) → admin aprueba → landing.
2. Al final, un enlace discreto: “También puedes dejarla en Google” → Maps.

No al revés (primero Google y luego SHIMAI): se pierde gente y no queda material para la web.

Pedir las dos reseñas en el mismo WhatsApp (“califica aquí y también en Google”) suele cansar y baja las dos tasas.

---

## ¿Se puede enviar la reseña de nuestro portal a Google?

**No.** Google no deja publicar una reseña en Maps desde un formulario de terceros.

- No hay API oficial para “el cliente escribió esto en SHIMAI, ponlo como reseña de Google”.
- Si alguien lo ofrece por un plugin o un servicio raro, incumple las políticas de Google y se puede caer la ficha.
- La reseña de Google **la escribe la persona en Google**, con su cuenta.

Lo que sí se puede:

| Acción | ¿Se puede? |
| --- | --- |
| Link profundo a escribir reseña en Maps (`place_id` del negocio) | Sí |
| Leer reseñas públicas de Google y mostrarlas en la landing | Sí (API / ficha), con atribución y sin editar el texto |
| Tomar comida + entrega de nuestro form y crear la reseña en Google | No |
| Prefill del texto en el formulario de Google | No (Google lo bloquea) |

Conclusión: **portal ≠ Google**. O se colecciona para la casa, o se manda a Maps, o se hacen las dos cosas en secuencia. Nunca un “publicar en Google por nosotros”.

---

## Flujo acordado si se elige el portal (A o C)

### Invitación (cron / lote diario)

- Pedidos en `delivered`, con teléfono, **sin reseña** y **sin invitación ya enviada**.
- Ventana: entregados hace **unas 4–24 h** (no al marcar entregado; aún están comiendo).
- Una sola invitación por pedido. Sin recordatorio al día siguiente.
- Canal: WhatsApp (Twilio), igual que “tu pedido va en camino”.
- Link mágico a `/reseña/…` atado a ese pedido (sin login). Caduca ~7–14 días.

### Formulario (móvil, una pantalla)

1. Comida — 5 estrellas. Obligatorio. “¿Cómo estuvo lo que llegó a la mesa?”
2. Entrega — 5 estrellas. Obligatorio. “¿Cómo estuvo la entrega?”
3. Comentario — opcional, 1–3 frases. “Lo que quieras contarle a las hermanas…”
4. Nombre para publicar — opcional. Si vacío: nombre del checkout o “Cliente SHIMAI”.

Fuera de v1: foto, email, NPS, Ane vs Imōto, chips, “¿nos recomiendas?”.

Al enviar: “Las hermanas la leen y, si la publican, aparece en la casa.” **No** decir que ya está en el sitio.

### Admin

- Lista: fecha, pedido, ★ comida, ★ entrega, comentario, nombre.
- Acciones: **Publicar** / **Ocultar**.
- En la web solo salen las **publicadas**. No editar el texto del cliente.

### Landing

- **Entre Las hermanas y el menú.**
- Título tipo “De la casa a tu mesa”.
- Máximo **3 reseñas**: nombre, las dos notas, la frase si hay.
- Si no hay ninguna aprobada, **no se muestra** la sección.

---

## Si se elige solo Google (B)

Pendiente de negocio, no de producto SHIMAI:

- Place ID / URL de reseña de la ficha de Google Business (Rioverde).
- Mismo cron y mismos filtros de pedido; el WhatsApp lleva el link de Google en lugar del formulario.
- Admin no aprueba (salvo un log de “invitación enviada” para no spamear).
- Landing: o sin reseñas, o un bloque que **replica** las de Google (lectura), no las nuestras.

---

## Checklist técnico (cuando se implemente)

- [ ] Decidir A, B o C.
- [ ] Tabla `reviews` (pedido, token, ★ comida, ★ entrega, comentario, nombre, estado: pending / published / hidden, invitacion_enviada_at).
- [ ] Página pública `/reseña/[token]`.
- [ ] Admin: menú Reseñas (aprobar / ocultar) — solo si A o C.
- [ ] Cron diario (Render cron o Supabase cron) + Twilio.
- [ ] Bloque en landing entre hermanas y menú — solo si A o C y hay publicadas.
- [ ] Place ID de Google — solo si B o C.

No hay código de esto en la app todavía.
