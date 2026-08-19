/**
 * Client helpers for Stripe / checkout.
 * Never compute totals here — call the Edge Function `checkout`.
 */

export type CheckoutCartItem = {
  product_id: string;
  quantity: number;
};

export type CheckoutRequestBody = {
  items: CheckoutCartItem[];
  payment_method:
    | "card_online"
    | "cash"
    | "bank_transfer"
    | "card_terminal";
  /** Plain-text address; fee is never accepted from the client. */
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_notes?: string | null;
  client_phone?: string | null;
  customer_name?: string | null;
  promo_code?: string | null;
  success_url?: string;
  cancel_url?: string;
};

export type CheckoutSuccessResponse = {
  success: true;
  order_id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  currency: string;
  subtotal: number;
  delivery_fee: number;
  discount?: number;
  promo_code?: string | null;
  promo_label?: string | null;
  delivery_distance_km?: number;
  total: number;
  items: Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  checkout_url?: string;
  stripe_session_id?: string;
  bank_details?: {
    bank_name: string;
    clabe: string;
    account_number: string;
    holder_name: string;
  };
  whatsapp_phone?: string;
  message?: string;
};

export type CheckoutErrorResponse = {
  success?: false;
  error: string;
  code?: string;
  details?: string;
  order_id?: string;
  distance_km?: number;
  max_radius_km?: number;
  missing_product_ids?: string[];
  unavailable_product_ids?: string[];
};

export class CheckoutError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "CheckoutError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Invokes `checkout` Edge Function.
 * Pass the user access token when logged in; guests may omit it.
 */
export async function requestCheckout(input: {
  supabaseUrl: string;
  anonKey: string;
  body: CheckoutRequestBody;
  accessToken?: string | null;
}): Promise<CheckoutSuccessResponse> {
  const response = await fetch(
    `${input.supabaseUrl.replace(/\/$/, "")}/functions/v1/checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: input.anonKey,
        Authorization: `Bearer ${input.accessToken ?? input.anonKey}`,
      },
      body: JSON.stringify(input.body),
    },
  );

  const data = (await response.json()) as
    | CheckoutSuccessResponse
    | CheckoutErrorResponse;

  if (!response.ok || !("success" in data) || data.success !== true) {
    const message =
      "error" in data && data.error
        ? data.error
        : `Checkout failed (${response.status})`;
    const code = "code" in data ? data.code : undefined;
    throw new CheckoutError(message, response.status, code);
  }

  return data;
}
