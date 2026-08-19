import { NextResponse } from "next/server";

/**
 * Placeholder for Stripe webhook handler.
 * Implement signature verification + order state updates here.
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Stripe webhook not configured yet." },
    { status: 501 },
  );
}
