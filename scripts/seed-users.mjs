// Creates the two (and only two) accounts for this app using the Supabase
// service role key. Run once after applying the SQL migrations:
//
//   node scripts/seed-users.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and the
// SHAB_EMAIL/SHAB_PASSWORD/SOUMYA_EMAIL/SOUMYA_PASSWORD vars from .env.local.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  { username: "shab", email: process.env.NEXT_PUBLIC_SHAB_EMAIL, password: process.env.SHAB_PASSWORD },
  { username: "soumya", email: process.env.NEXT_PUBLIC_SOUMYA_EMAIL, password: process.env.SOUMYA_PASSWORD },
];

for (const acc of accounts) {
  if (!acc.email || !acc.password) {
    console.error(`Missing email/password for ${acc.username} in .env.local`);
    continue;
  }
  const localPart = acc.email.split("@")[0].toLowerCase();
  if (localPart !== acc.username) {
    console.error(
      `⚠ ${acc.email} — the local part of the email must be "${acc.username}" (it becomes the username via the handle_new_user trigger). Got "${localPart}".`
    );
    continue;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: acc.email,
    password: acc.password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log(`✓ ${acc.username} (${acc.email}) already exists — skipping.`);
    } else {
      console.error(`✗ Failed to create ${acc.username}:`, error.message);
    }
    continue;
  }

  console.log(`✓ Created ${acc.username} (${acc.email}) — id ${data.user.id}`);
}

console.log("\nDone. Sign in at /login with these credentials.");
