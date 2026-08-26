/**
 * Generate VAPID keys for SHIMAI Web Push.
 * Store in shimai.settings key web_push_vapid (not Supabase global secrets).
 *
 * Usage: node scripts/generate-vapid-keys.mjs
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log(JSON.stringify(
  {
    public_key: keys.publicKey,
    private_key: keys.privateKey,
    subject: "mailto:hello@shimai.mx",
  },
  null,
  2,
));

console.log("\nSQL (run in Supabase SQL editor):");
console.log(`update shimai.settings
set value = '${JSON.stringify({
  public_key: keys.publicKey,
  private_key: keys.privateKey,
  subject: "mailto:hello@shimai.mx",
})}'::jsonb
where key = 'web_push_vapid';`);
