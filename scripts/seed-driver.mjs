/**
 * One-off: create or update SHIMAI test driver account.
 * Usage: node scripts/seed-driver.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EMAIL = "axius.agency@gmail.com";
const PASSWORD = "shimai123";
const FULL_NAME = "Repartidor Demo";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const db = createClient(url, serviceKey, {
  db: { schema: "shimai" },
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: listed, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("listUsers:", listError.message);
  process.exit(1);
}

const existing = listed.users.find(
  (user) => user.email?.toLowerCase() === EMAIL.toLowerCase(),
);

let userId = existing?.id;

if (existing) {
  const { error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    },
  );
  if (updateError) {
    console.error("updateUser:", updateError.message);
    process.exit(1);
  }
  console.log("Updated existing auth user password.");
} else {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
  if (createError) {
    console.error("createUser:", createError.message);
    process.exit(1);
  }
  userId = created.user?.id;
  console.log("Created auth user.");
}

if (!userId) {
  console.error("No user id");
  process.exit(1);
}

const { error: profileError } = await db.from("profiles").upsert(
  {
    id: userId,
    full_name: FULL_NAME,
    role: "driver",
  },
  { onConflict: "id" },
);

if (profileError) {
  console.error("profile upsert:", profileError.message);
  process.exit(1);
}

console.log("");
console.log("Driver listo:");
console.log(`  Email:    ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log(`  Login:    /driver/login`);
