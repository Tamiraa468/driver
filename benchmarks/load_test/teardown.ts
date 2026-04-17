/**
 * Post-run cleanup:
 *  - Deletes the race task created by create_task.ts
 *  - Resets any claim_delivery_task assignments on bench-tagged tasks
 *  - Optionally deletes bench courier users (pass --users to enable; off by
 *    default so repeat runs can reuse the JWT cache)
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { resolve } from "path";
import { validateEnv } from "../validate_env";

validateEnv([
  { key: "SUPABASE_URL", description: "Staging project URL", urlLike: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", description: "Staging service_role key" },
]);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const deleteUsers = process.argv.includes("--users");

async function main() {
  const taskJson = resolve(import.meta.dirname ?? __dirname, "task.json");
  if (existsSync(taskJson)) {
    const { id } = JSON.parse(readFileSync(taskJson, "utf8")) as {
      id: string;
    };
    const { error } = await admin
      .from("delivery_tasks")
      .delete()
      .eq("id", id);
    if (error) console.warn("Task delete failed:", error.message);
    else console.log("Deleted race task:", id);
    unlinkSync(taskJson);
  }

  // Clean up any stragglers from aborted runs.
  const { error: bulkErr, count } = await admin
    .from("delivery_tasks")
    .delete({ count: "exact" })
    .like("note", "bench-%");
  if (bulkErr) console.warn("Bulk bench cleanup failed:", bulkErr.message);
  else console.log(`Deleted ${count ?? 0} leftover bench tasks.`);

  if (deleteUsers) {
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) {
      console.warn("listUsers failed:", error.message);
      return;
    }
    const targets = data.users.filter((u) =>
      u.email?.includes("@bench.courier.example.com"),
    );
    for (const u of targets) {
      await admin.auth.admin.deleteUser(u.id).catch(() => {});
    }
    console.log(`Deleted ${targets.length} bench courier users.`);
  }
}

main();
