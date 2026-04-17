/**
 * Pre-provision N test couriers and pre-authenticate them so the k6 load test
 * can start with a ready pool of JWTs — this avoids measuring auth latency
 * during the race.
 *
 * For each virtual courier i ∈ [0, N):
 *   - Create (idempotent) user "bench.courier+<i>@example.com"
 *   - Promote to approved courier via admin update
 *   - Sign in → capture access_token
 *
 * Output: benchmarks/load_test/jwts.json  — a flat array [{ id, email, token }]
 *
 * Usage:
 *   npm run prepare-jwts -- --n 200
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { validateEnv } from "../validate_env";

validateEnv([
  { key: "SUPABASE_URL", description: "Staging project URL", urlLike: true },
  { key: "SUPABASE_ANON_KEY", description: "Staging anon key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", description: "Staging service_role key" },
]);

const N = Number(
  process.argv.find((a) => a.startsWith("--n="))?.split("=")[1] ??
    process.env.LOAD_TEST_MAX_COURIERS ??
    50,
);

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } =
  process.env;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const PASSWORD = "Bench!Test#2026";
const BENCH_DOMAIN = "bench.courier.example.com";

interface JwtRow {
  id: string;
  email: string;
  token: string;
}

async function ensureUser(i: number): Promise<JwtRow> {
  const email = `bench+${i}@${BENCH_DOMAIN}`;

  // Try to create; ignore "user already exists".
  const { data: createData, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "courier", kyc_status: "approved" },
    });

  let userId = createData?.user?.id;
  if (createErr && !/already/i.test(createErr.message)) {
    throw new Error(`createUser failed for ${email}: ${createErr.message}`);
  }
  if (!userId) {
    // Fetch existing.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const found = list.users.find((u) => u.email === email);
    if (!found) throw new Error(`user not found after create: ${email}`);
    userId = found.id;
  }

  // Idempotent ensure: role=courier, kyc_status=approved, not blocked.
  // Adjust column names if your schema differs.
  await admin
    .from("courier_profiles")
    .upsert(
      {
        id: userId,
        full_name: `Bench Courier ${i}`,
        phone: `+976990000${String(i).padStart(4, "0")}`,
        kyc_status: "approved",
        is_blocked: false,
      },
      { onConflict: "id" },
    )
    .throwOnError();

  // Sign in to get a real access_token.
  const { data: sessionData, error: signInErr } =
    await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInErr || !sessionData.session?.access_token) {
    throw new Error(
      `signIn failed for ${email}: ${signInErr?.message ?? "no token"}`,
    );
  }
  return {
    id: userId,
    email,
    token: sessionData.session.access_token,
  };
}

async function main() {
  console.log(`Provisioning ${N} bench couriers…`);
  const tokens: JwtRow[] = [];

  // Sequential — admin API is rate-limited on Pro tier.
  for (let i = 0; i < N; i++) {
    try {
      const row = await ensureUser(i);
      tokens.push(row);
      if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${N}`);
    } catch (err) {
      console.error(`  ! courier ${i} failed:`, (err as Error).message);
    }
  }

  const out = resolve(import.meta.dirname ?? __dirname, "jwts.json");
  writeFileSync(out, JSON.stringify(tokens, null, 2));
  console.log(`Wrote ${tokens.length} tokens → ${out}`);
  console.log(
    "NOTE: access_tokens expire (default 1h). Re-run before each load test.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
