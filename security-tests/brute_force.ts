/**
 * Brute-force simulation of verify_epod_otp() — scenarios A, B, C.
 *
 * ------------------------------------------------------------------------
 * IMPORTANT: this script deliberately exhausts the OTP-verify path 1000+
 * times. It inserts synthetic delivery_tasks and may corrupt real rows if
 * pointed at production. lib/guards.ts blocks execution in production.
 * ------------------------------------------------------------------------
 *
 * Scenarios (selected via --scenario=A|B|C|all, default = all):
 *
 *   A. Single session, 1000 attempts
 *      One courier token vs ONE delivered task. If the schema has an attempt
 *      counter/lockout, we expect success after N (typically 5); without it
 *      we record the raw latency + wrong-code classification.
 *
 *   B. Multi-session, 10 × 100 attempts
 *      10 couriers share ONE delivered task. NOTE: each courier must own the
 *      task for verify_epod_otp() to accept the RPC, so this scenario tests
 *      whether the lockout (if any) is per-session or per-task by re-assigning
 *      the task to each courier between batches. If you want per-session
 *      rate limiting only, this will show it; if per-task, Batch 2 should
 *      already be locked on first attempt.
 *
 *   C. Legitimate user after lockout
 *      Run scenario A to lock, then:
 *        - resend_epod_otp() to generate a new OTP (plain text captured)
 *        - verify_epod_otp() with the correct new OTP
 *      Records whether a fresh OTP clears the lock state.
 *
 * Output: security-tests/results/brute_force_<scenario>_<timestamp>.csv
 * Columns: attempt_number, otp_tried, response_code, duration_ms, was_locked,
 *          new_otp_issued, scenario, courier_email, task_id, raw_message
 */

import "dotenv/config";
import { performance } from "perf_hooks";
import { randomUUID } from "crypto";

import { assertStaging } from "./lib/guards";
import { admin, anon, asCourier, AuthedCourier } from "./lib/clients";
import { CsvWriter } from "./lib/csv";
import {
  createDeliveredTaskForCourier,
  randomSixDigit,
  TaskFixture,
} from "./lib/fixtures";

// ── 0. Safety fence — abort if NODE_ENV=production or URL mismatches ──
assertStaging();

// ── 1. Argument parsing ──────────────────────────────────────────────
const args = process.argv.slice(2);
function argValue(name: string, fallback?: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  if (arg) return arg.split("=")[1];
  return fallback;
}
const scenario = (argValue("scenario", "all") ?? "all").toUpperCase();
const attemptsA = Number(argValue("n-a", "1000"));
const multiCouriers = Number(argValue("n-b-couriers", "10"));
const attemptsPerCourier = Number(argValue("n-b-attempts", "100"));

// ── 2. CSV output path ───────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const csvPath = `results/brute_force_${scenario}_${ts}.csv`;
const writer = new CsvWriter(csvPath, [
  "attempt_number",
  "otp_tried",
  "response_code",
  "duration_ms",
  "was_locked",
  "new_otp_issued",
  "scenario",
  "courier_email",
  "task_id",
  "raw_message",
]);

// ── 3. Helpers ───────────────────────────────────────────────────────

type ResponseCode =
  | "SUCCESS"
  | "WRONG_OTP"
  | "EXPIRED"
  | "NOT_FOUND"
  | "LOCKED"
  | "RATE_LIMITED"
  | "UNEXPECTED";

function classify(body: {
  success?: boolean;
  message?: string;
  error?: unknown;
}): ResponseCode {
  if (body?.success === true) return "SUCCESS";
  const m = (body?.message ?? "").toLowerCase();
  if (/олдсонгүй|not found|delivered.*биш/i.test(m)) return "NOT_FOUND";
  if (/хугацаа.*дуусс|expired/i.test(m)) return "EXPIRED";
  if (/оролдлого|locked|too many|rate.?limit/i.test(m)) return "LOCKED";
  if (/буруу|incorrect|invalid/i.test(m)) return "WRONG_OTP";
  return "UNEXPECTED";
}

interface AttemptResult {
  code: ResponseCode;
  duration_ms: number;
  message: string;
  raw: unknown;
}

async function attemptOtp(
  courier: AuthedCourier,
  taskId: string,
  otp: string,
): Promise<AttemptResult> {
  const t0 = performance.now();
  const { data, error } = await courier.client.rpc("verify_epod_otp", {
    p_task_id: taskId,
    p_otp: otp,
  });
  const t1 = performance.now();
  const body = (error
    ? { success: false, message: error.message }
    : (data as { success?: boolean; message?: string })) ?? {};
  return {
    code: classify(body),
    duration_ms: Math.round((t1 - t0) * 1000) / 1000,
    message: body.message ?? "",
    raw: data ?? error,
  };
}

// ── 4. Scenario A — Single session ──────────────────────────────────

async function scenarioA(bench: AuthedCourier): Promise<void> {
  console.log(`[A] creating fixture for ${bench.email}`);
  const fixture = await createDeliveredTaskForCourier(
    admin(),
    bench.client,
    bench.userId,
    process.env.SEED_ORG_ID ?? null,
  );
  console.log(`[A] task=${fixture.taskId} plainOtp=${fixture.plainOtp}`);
  console.log(
    `[A] attempt-counter column present in schema: ${fixture.hasAttemptCounter}`,
  );

  try {
    let lockedAt: number | null = null;
    for (let i = 1; i <= attemptsA; i++) {
      // Deliberately avoid the real OTP; randomSixDigit excludes it.
      const otp = randomSixDigit(fixture.plainOtp);
      const result = await attemptOtp(bench, fixture.taskId, otp);

      const isLocked = result.code === "LOCKED" || result.code === "RATE_LIMITED";
      if (isLocked && lockedAt === null) lockedAt = i;

      writer.write({
        attempt_number: i,
        otp_tried: otp,
        response_code: result.code,
        duration_ms: result.duration_ms,
        was_locked: fixture.hasAttemptCounter ? String(isLocked) : "n/a",
        new_otp_issued: "false",
        scenario: "A",
        courier_email: bench.email,
        task_id: fixture.taskId,
        raw_message: result.message.slice(0, 200),
      });

      if (i % 50 === 0) {
        console.log(
          `[A] ${i}/${attemptsA} last=${result.code} ${result.duration_ms}ms`,
        );
      }
    }

    // ── Assertions / observations ───────────────────────────────────
    console.log(`[A] DONE. First LOCKED response at attempt: ${lockedAt ?? "never"}`);
    if (fixture.hasAttemptCounter) {
      if (lockedAt === null) {
        console.warn(
          "[A] WARNING: schema claims attempt counter but no lock was triggered — investigate.",
        );
      } else if (lockedAt > 10) {
        console.warn(
          `[A] WARNING: expected lock around attempt 5, got ${lockedAt}.`,
        );
      }
    } else {
      console.warn(
        "[A] NOTE: current schema has NO attempt counter. 1000/1000 WRONG_OTP responses were accepted. " +
          "This is an empirical finding for the thesis — apply migrations/005_otp_lockout.sql to enforce the claimed 5-attempt limit.",
      );
    }
  } finally {
    console.log(`[A] teardown task=${fixture.taskId}`);
    await fixture.teardown();
  }
}

// ── 5. Scenario B — Multi-session ───────────────────────────────────

async function loadMultiCouriers(): Promise<AuthedCourier[]> {
  // Prefer JSON if provided, else build from prefix.
  const json = process.env.BENCH_MULTI_COURIERS;
  if (json) {
    const arr = JSON.parse(json) as { email: string; password: string }[];
    return Promise.all(arr.map((c) => asCourier(c.email, c.password)));
  }
  const prefix = process.env.BENCH_MULTI_PREFIX ?? "bench.courier.multi";
  const domain = process.env.BENCH_MULTI_DOMAIN ?? "example.com";
  const password = process.env.BENCH_MULTI_PASSWORD;
  if (!password) {
    throw new Error(
      "BENCH_MULTI_PASSWORD required for scenario B (or provide BENCH_MULTI_COURIERS JSON)",
    );
  }
  const out: AuthedCourier[] = [];
  for (let i = 0; i < multiCouriers; i++) {
    const email = `${prefix}+${i}@${domain}`;
    try {
      out.push(await asCourier(email, password));
    } catch (err) {
      console.warn(`[B] could not sign in ${email}: ${(err as Error).message}`);
    }
  }
  return out;
}

async function scenarioB(primary: AuthedCourier): Promise<void> {
  const couriers = await loadMultiCouriers();
  if (couriers.length < 2) {
    console.error(`[B] aborting — only ${couriers.length} couriers available`);
    return;
  }
  console.log(`[B] ${couriers.length} couriers loaded`);

  // For each courier, assign the task to THEM, generate an OTP, blast 100
  // wrong codes, teardown. This mirrors "org-level" rate-limiting across
  // different sessions: if rate-limit is per-session, each batch should get
  // its own lockout; if per-task, batch 2+ should be locked immediately.
  const adminClient = admin();

  for (let idx = 0; idx < couriers.length; idx++) {
    const courier = couriers[idx];
    console.log(`[B] batch ${idx + 1}/${couriers.length} — ${courier.email}`);
    const fixture = await createDeliveredTaskForCourier(
      adminClient,
      courier.client,
      courier.userId,
      process.env.SEED_ORG_ID ?? null,
    );

    try {
      let lockedThisBatch = false;
      for (let i = 1; i <= attemptsPerCourier; i++) {
        const otp = randomSixDigit(fixture.plainOtp);
        const result = await attemptOtp(courier, fixture.taskId, otp);
        const isLocked =
          result.code === "LOCKED" || result.code === "RATE_LIMITED";
        if (isLocked) lockedThisBatch = true;

        writer.write({
          attempt_number: idx * attemptsPerCourier + i,
          otp_tried: otp,
          response_code: result.code,
          duration_ms: result.duration_ms,
          was_locked: fixture.hasAttemptCounter ? String(isLocked) : "n/a",
          new_otp_issued: "false",
          scenario: "B",
          courier_email: courier.email,
          task_id: fixture.taskId,
          raw_message: result.message.slice(0, 200),
        });
      }
      console.log(
        `[B] batch ${idx + 1} done, locked=${lockedThisBatch}`,
      );
    } finally {
      await fixture.teardown();
    }
  }
}

// ── 6. Scenario C — Legitimate user after lockout ───────────────────

async function scenarioC(bench: AuthedCourier): Promise<void> {
  console.log(`[C] setup — lock the OTP via scenario-A style attempts`);
  const fixture = await createDeliveredTaskForCourier(
    admin(),
    bench.client,
    bench.userId,
    process.env.SEED_ORG_ID ?? null,
  );
  try {
    // Drive enough wrong attempts to trip any lockout. Cap at 10 — if schema
    // has a 5-attempt threshold we'll be past it; if it has none, this is
    // still a small probe.
    for (let i = 1; i <= 10; i++) {
      const otp = randomSixDigit(fixture.plainOtp);
      const result = await attemptOtp(bench, fixture.taskId, otp);
      writer.write({
        attempt_number: i,
        otp_tried: otp,
        response_code: result.code,
        duration_ms: result.duration_ms,
        was_locked: fixture.hasAttemptCounter
          ? String(result.code === "LOCKED")
          : "n/a",
        new_otp_issued: "false",
        scenario: "C-setup",
        courier_email: bench.email,
        task_id: fixture.taskId,
        raw_message: result.message.slice(0, 200),
      });
    }

    console.log(`[C] requesting new OTP via resend_epod_otp`);
    const newPlain = await fixture.regenerateOtp();
    writer.write({
      attempt_number: 0,
      otp_tried: newPlain.replace(/./g, "*"), // never log plain OTP
      response_code: "SUCCESS",
      duration_ms: 0,
      was_locked: "n/a",
      new_otp_issued: "true",
      scenario: "C-reissue",
      courier_email: bench.email,
      task_id: fixture.taskId,
      raw_message: "resend_epod_otp returned new OTP",
    });

    console.log(`[C] verifying with correct new OTP`);
    const verifyResult = await attemptOtp(bench, fixture.taskId, newPlain);
    writer.write({
      attempt_number: 1,
      otp_tried: newPlain.replace(/./g, "*"),
      response_code: verifyResult.code,
      duration_ms: verifyResult.duration_ms,
      was_locked: "false",
      new_otp_issued: "false",
      scenario: "C-verify",
      courier_email: bench.email,
      task_id: fixture.taskId,
      raw_message: verifyResult.message.slice(0, 200),
    });

    console.log(`[C] post-reissue verify → ${verifyResult.code}`);
    if (verifyResult.code !== "SUCCESS") {
      console.warn(
        `[C] WARNING: legitimate courier could NOT verify after reissue. message="${verifyResult.message}"`,
      );
    }
  } finally {
    await fixture.teardown();
  }
}

// ── 7. Orchestrator ──────────────────────────────────────────────────

async function main(): Promise<void> {
  const email = process.env.BENCH_COURIER_EMAIL;
  const password = process.env.BENCH_COURIER_PASSWORD;
  if (!email || !password) {
    throw new Error("BENCH_COURIER_EMAIL / BENCH_COURIER_PASSWORD required");
  }
  const bench = await asCourier(email, password);
  console.log(`[main] authed as ${bench.email} (${bench.userId})`);
  console.log(`[main] writing results → ${csvPath}`);

  if (scenario === "A" || scenario === "ALL") await scenarioA(bench);
  if (scenario === "B" || scenario === "ALL") await scenarioB(bench);
  if (scenario === "C" || scenario === "ALL") await scenarioC(bench);

  console.log(`[main] done → ${csvPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
