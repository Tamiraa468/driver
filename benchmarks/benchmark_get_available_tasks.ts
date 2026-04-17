/**
 * Benchmark: get_available_tasks RPC latency.
 *
 * Runs two passes against the same Supabase project:
 *   1. anon-role + authenticated user JWT  → RLS path
 *   2. service_role key                    → RLS bypassed
 *
 * Pipeline per pass:
 *   - WARMUP_ITERATIONS (10) to prime connection pool and PostgREST cache
 *   - MEASUREMENT_ITERATIONS (100) samples recorded with performance.now()
 *   - p50 / p95 / p99 computed nearest-rank
 *
 * Outputs:
 *   - CSV summary row → benchmarks/results/get_available_tasks.csv
 *   - Raw per-call samples → benchmarks/results/get_available_tasks_raw.csv
 *     (so the Python analysis script can build histograms)
 *
 * Run:
 *   cd benchmarks
 *   cp .env.example .env  # fill in
 *   npm install
 *   npm run seed           # one-off, populates delivery_tasks
 *   npm run bench:get-available
 */

import "dotenv/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { appendFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { performance } from "perf_hooks";

const WARMUP_ITERATIONS = 10;
const MEASUREMENT_ITERATIONS = 100;
const RESULTS_DIR = resolve(import.meta.dirname ?? __dirname, "results");
const SUMMARY_CSV = resolve(RESULTS_DIR, "get_available_tasks.csv");
const RAW_CSV = resolve(RESULTS_DIR, "get_available_tasks_raw.csv");

import { validateEnv } from "./validate_env";

validateEnv([
  { key: "SUPABASE_URL", description: "Staging project URL", urlLike: true },
  { key: "SUPABASE_ANON_KEY", description: "Staging anon key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", description: "Staging service_role key" },
]);

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  BENCH_USER_EMAIL,
  BENCH_USER_PASSWORD,
} = process.env;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1];
}

interface Sample {
  iteration: number;
  role: "authenticated" | "service_role";
  duration_ms: number;
  rows_returned: number;
  error: string | null;
}

async function runPass(
  client: SupabaseClient,
  role: Sample["role"],
): Promise<Sample[]> {
  const samples: Sample[] = [];

  console.log(`[${role}] warm-up ×${WARMUP_ITERATIONS}`);
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await client.rpc("get_available_tasks", { p_limit: 50, p_offset: 0 });
  }

  console.log(`[${role}] measuring ×${MEASUREMENT_ITERATIONS}`);
  for (let i = 0; i < MEASUREMENT_ITERATIONS; i++) {
    const t0 = performance.now();
    const { data, error } = await client.rpc("get_available_tasks", {
      p_limit: 50,
      p_offset: 0,
    });
    const t1 = performance.now();
    samples.push({
      iteration: i,
      role,
      duration_ms: t1 - t0,
      rows_returned: Array.isArray(data) ? data.length : 0,
      error: error ? error.message : null,
    });
  }
  return samples;
}

function summarise(samples: Sample[]) {
  const durations = samples
    .filter((s) => !s.error)
    .map((s) => s.duration_ms)
    .sort((a, b) => a - b);
  const errors = samples.filter((s) => s.error).length;
  return {
    n: samples.length,
    errors,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    min: durations[0] ?? 0,
    max: durations[durations.length - 1] ?? 0,
    mean:
      durations.reduce((a, b) => a + b, 0) / Math.max(durations.length, 1),
  };
}

function writeCsv(rows: Sample[], firstRun: boolean) {
  mkdirSync(dirname(RAW_CSV), { recursive: true });
  if (firstRun) {
    writeFileSync(
      RAW_CSV,
      "role,iteration,duration_ms,rows_returned,error\n",
    );
  }
  for (const r of rows) {
    appendFileSync(
      RAW_CSV,
      `${r.role},${r.iteration},${r.duration_ms.toFixed(3)},${r.rows_returned},${r.error ? JSON.stringify(r.error) : ""}\n`,
    );
  }
}

function writeSummary(
  role: string,
  s: ReturnType<typeof summarise>,
  firstRun: boolean,
) {
  if (firstRun) {
    writeFileSync(
      SUMMARY_CSV,
      "role,n,errors,p50_ms,p95_ms,p99_ms,min_ms,max_ms,mean_ms,timestamp\n",
    );
  }
  const row = [
    role,
    s.n,
    s.errors,
    s.p50.toFixed(3),
    s.p95.toFixed(3),
    s.p99.toFixed(3),
    s.min.toFixed(3),
    s.max.toFixed(3),
    s.mean.toFixed(3),
    new Date().toISOString(),
  ].join(",");
  appendFileSync(SUMMARY_CSV, row + "\n");
}

async function main() {
  // --- Pass 1: authenticated user (RLS active) ---
  const authClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  if (BENCH_USER_EMAIL && BENCH_USER_PASSWORD) {
    const { error } = await authClient.auth.signInWithPassword({
      email: BENCH_USER_EMAIL,
      password: BENCH_USER_PASSWORD,
    });
    if (error) {
      console.error("Could not sign in bench user:", error);
      process.exit(1);
    }
    console.log("Signed in as", BENCH_USER_EMAIL);
  } else {
    console.warn(
      "BENCH_USER_EMAIL/PASSWORD not set — authenticated pass will run anonymously",
    );
  }

  const authSamples = await runPass(authClient, "authenticated");
  const authSummary = summarise(authSamples);

  writeCsv(authSamples, true);
  writeSummary("authenticated", authSummary, true);
  console.log("authenticated →", authSummary);

  // --- Pass 2: service_role (RLS bypassed) ---
  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const adminSamples = await runPass(admin, "service_role");
  const adminSummary = summarise(adminSamples);

  writeCsv(adminSamples, false);
  writeSummary("service_role", adminSummary, false);
  console.log("service_role →", adminSummary);

  console.log("\nSummary CSV:", SUMMARY_CSV);
  console.log("Raw CSV:    ", RAW_CSV);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
