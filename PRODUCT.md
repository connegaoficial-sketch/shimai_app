# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mezcla ~50/50:

- Personas en Rioverde y zona que ya conocen SHIMAI (WhatsApp, boca a boca) y vuelven a pedir.
- Primera visita por link o redes: nunca han pedido; necesitan entender qué es, confiar y atreverse a ordenar.

**Máxima de copy (producto):** ~80% de los clientes frecuentes **no saben qué pedir**. La UI debe reducir la parálisis: sugerir firmas, guiar por antojo (intenso / fresco / compartir) y completar la mesa (bebida/postre), no asumir que conocen Ane, Imōto o Futari.

Situación típica: quieren sushi bueno en casa, sin ir a un local. Dudas frecuentes: qué elegir, si es cocina real, si llega a tiempo, a dónde entregan y cómo pagar.

## Product Purpose

SHIMAI Sushi House es una dark kitchen de sushi con pedido online y entrega a domicilio. La web pública debe enamorar del menú, dar confianza para pedir y convertir en pedido completado (carrito → checkout).

Éxito: el visitante entiende la oferta en segundos, confía en la entrega y agrega piezas al carrito.

## Positioning

Menú narrado por dos hermanas (Ane, Imōto) y lo que crean juntas (Futari): intensidad, frescura y firma de la casa. No es un local físico; es cocina que llega a domicilio.

## Operating Context

- Dark kitchen · entrega a domicilio.
- Cobertura confirmada: Rioverde, Ciudad Fernández, El Refugio y alrededores (SLP).
- Horario de cocina: 10:00–22:00.
- Tiempo aproximado de entrega: ~30 minutos (estimado; no garantía).
- Pagos al pedir (comunicar en landing): efectivo, terminal al entregar, transferencia.
- Stripe / tarjeta online: **no comunicar por ahora** en la landing (puede existir en código de checkout; no es promesa pública actual).
- Contacto de ayuda: WhatsApp (configurado en settings).
- Reseñas en portal/Google: idea documentada, **aún no implementada** — no inventar testimonios ni estrellas.

## Capabilities and Constraints

- Menú por categorías, productos, firmas, promos, carrito, checkout, tracker de pedido.
- Admin de menú, pedidos, zonas, equipo; app de repartidor.
- No inventar reseñas, stats, garantías de tiempo exacto ni métodos de pago no confirmados.
- Preservar identidad de marca existente (nombre, hermanas, logos, paleta negro/oro/sakura/ivory).

## Brand Commitments

- Nombre: SHIMAI / SHIMAI Sushi House.
- Lema: «Por hermanas · Una historia · Un sabor».
- Voces: Ane (mayor), Imōto (menor), Futari (juntas).
- Assets: `/logo_shimai.jpeg`, `/logo_shimai_2.jpeg`, animación de logo en hero.
- Voz: cálida, clara, mexicana natural; premium sin hype vacío. Orientada a decidir, no a lucir menú.

## Evidence on Hand

- Brand config: `src/lib/brand/shimai.ts`.
- Logos y video en `public/`.
- Menú y precios desde base de datos (dinámicos).
- Zonas/pagos/horario confirmados por el negocio (2026-08-24) para copy de confianza.
- Ausente: reseñas publicables, fotos de cocina/entrega de stock propio más allá de productos del menú.

## Product Principles

1. Confianza antes que adorno: horarios, zona, tiempos y pagos visibles y veraces.
2. Deseo → pedido: el menú y el CTA «Pedir ahora» no se entierran tras storytelling largo.
3. Claridad sobre persuasión creativa; nunca inventar hechos. Ayudar a elegir > presumir catálogo.
4. Una acción principal por momento: pedir / agregar / ir al carrito.
5. Preservar el mundo visual SHIMAI; elevar conversión dentro de esa identidad.
6. Ante la duda del cliente (“no sé qué pedir”), la interfaz propone el siguiente paso concreto.
