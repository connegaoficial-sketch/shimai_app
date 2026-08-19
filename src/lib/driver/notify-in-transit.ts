/**
 * Sends WhatsApp (Twilio) when a delivery starts.
 * Uses env TWILIO_*; no-ops if not configured.
 */
export async function notifyOrderInTransit(input: {
  orderId: string;
  clientPhone: string | null;
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw = process.env.TWILIO_PHONE_NUMBER?.trim();
  const appUrl = (
    process.env.SHIMAI_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  if (!accountSid || !authToken || !fromRaw) {
    console.info("[twilio] skipped — missing TWILIO_* env");
    return;
  }

  const to = normalizeWhatsAppNumber(input.clientPhone);
  if (!to) {
    console.info("[twilio] skipped — missing client phone");
    return;
  }

  const trackerUrl = `${appUrl}/tracker/${input.orderId}`;
  const body =
    `Tu pedido SHIMAI está en camino. Sigue a tu repartidor aquí: ${trackerUrl}`;

  const from = fromRaw.startsWith("whatsapp:")
    ? fromRaw
    : `whatsapp:${fromRaw}`;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64",
  );

  const params = new URLSearchParams();
  params.set("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
  params.set("From", from);
  params.set("Body", body);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("[twilio] send failed", response.status, text);
  }
}

function normalizeWhatsAppNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("52")) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}
