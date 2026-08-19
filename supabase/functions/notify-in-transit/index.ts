import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Optional webhook target for order status → in_transit WhatsApp.
 * Prefer calling from the driver server action; this is a backup hook.
 *
 * Expects JSON: { order_id, client_phone?, record?: { ... } }
 */

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim() ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim() ?? "";
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")?.trim() ?? "";
const APP_URL = (
  Deno.env.get("SHIMAI_APP_URL") ||
  Deno.env.get("APP_ORIGIN") ||
  "http://localhost:3000"
).replace(/\/$/, "");

function normalizeWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("52")) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const record = payload?.record ?? payload;
    const status = String(record?.status ?? payload?.status ?? "");
    const orderId = String(record?.id ?? payload?.order_id ?? "").trim();
    const phone = normalizeWhatsAppNumber(
      record?.client_phone ?? payload?.client_phone,
    );

    if (status !== "in_transit") {
      return new Response(JSON.stringify({ skipped: true, reason: "not_in_transit" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!orderId || !phone) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing_data" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(JSON.stringify({ skipped: true, reason: "twilio_unconfigured" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const from = TWILIO_PHONE_NUMBER.startsWith("whatsapp:")
      ? TWILIO_PHONE_NUMBER
      : `whatsapp:${TWILIO_PHONE_NUMBER}`;
    const trackerUrl = `${APP_URL}/tracker/${orderId}`;
    const body =
      `Tu pedido SHIMAI está en camino. Sigue a tu repartidor aquí: ${trackerUrl}`;

    const params = new URLSearchParams();
    params.set("To", phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`);
    params.set("From", from);
    params.set("Body", body);

    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );

    const twilioBody = await twilioRes.text();
    if (!twilioRes.ok) {
      console.error("twilio error", twilioRes.status, twilioBody);
      return new Response(JSON.stringify({ error: "twilio_failed", details: twilioBody }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
