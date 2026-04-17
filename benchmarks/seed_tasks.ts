/**
 * Seed script: inserts N published delivery_tasks so get_available_tasks has
 * realistic data to measure against. Uses service_role so RLS is bypassed.
 *
 * Usage:
 *   npm run seed
 *
 * Safe to run repeatedly — tasks are tagged with a "bench-" prefix in note so
 * teardown can clean them up.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { validateEnv } from "./validate_env";

validateEnv([
  { key: "SUPABASE_URL", description: "Staging project URL", urlLike: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", description: "Staging service_role key" },
]);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_TASK_COUNT, SEED_ORG_ID } =
  process.env;

const COUNT = Number(SEED_TASK_COUNT ?? 60);
const ORG_ID = SEED_ORG_ID || null;
const BENCH_TAG = "bench-seed";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`Seeding ${COUNT} published delivery_tasks…`);
  const rows = Array.from({ length: COUNT }).map((_, i) => ({
    id: randomUUID(),
    status: "published" as const,
    pickup_note: `Bench pickup ${i} — 123 Peace Ave, Ulaanbaatar`,
    dropoff_note: `Bench dropoff ${i} — 456 Tumen Ave, Ulaanbaatar`,
    note: `${BENCH_TAG}#${i}`,
    delivery_fee: 5000 + (i % 20) * 500,
    package_value: 20000 + (i % 10) * 1000,
    receiver_name: `Bench Receiver ${i}`,
    receiver_phone: `+9769900${String(i).padStart(4, "0")}`,
    customer_email: `bench+${i}@example.com`,
    org_id: ORG_ID,
  }));

  const { error } = await admin.from("delivery_tasks").insert(rows);
  if (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
  console.log(`Seeded ${COUNT} tasks (tag=${BENCH_TAG}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
