/**
 * Creates ONE published delivery_task and prints its UUID + a single-use JSON
 * file at benchmarks/load_test/task.json. k6 reads this file at setup().
 *
 * Called once before each concurrency scenario; paired with teardown.ts which
 * deletes the task and clears claim_delivery_task assignments.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { resolve } from "path";
import { validateEnv } from "../validate_env";

validateEnv([
  { key: "SUPABASE_URL", description: "Staging project URL", urlLike: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", description: "Staging service_role key" },
]);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ORG_ID } = process.env;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const id = randomUUID();
  const { error } = await admin.from("delivery_tasks").insert({
    id,
    status: "published",
    pickup_note: "Race test pickup",
    dropoff_note: "Race test dropoff",
    note: "bench-race",
    delivery_fee: 5000,
    package_value: 20000,
    receiver_name: "Race Receiver",
    receiver_phone: "+97699000000",
    customer_email: "race@example.com",
    org_id: SEED_ORG_ID || null,
  });
  if (error) {
    console.error("Insert failed:", error);
    process.exit(1);
  }
  const out = resolve(import.meta.dirname ?? __dirname, "task.json");
  writeFileSync(out, JSON.stringify({ id }, null, 2));
  console.log("Created task:", id, "→", out);
}

main();
