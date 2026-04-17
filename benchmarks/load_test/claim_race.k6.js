/**
 * k6 concurrent-claim race test.
 *
 * Goal: N virtual couriers call claim_delivery_task(p_task_id) as close to
 * t=0 as possible; assert exactly one succeeds.
 *
 * Scenarios are driven by the env var N (10, 50, 100, 200). Run one at a
 * time so results are comparable:
 *
 *   # 1. create the race task via Node helper (once per N)
 *   npx tsx load_test/create_task.ts
 *
 *   # 2. run the k6 scenario for a given N
 *   k6 run -e N=10 \
 *          -e SUPABASE_URL=$SUPABASE_URL \
 *          -e SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
 *          --summary-export=results/claim_race_n10_summary.json \
 *          --out json=results/claim_race_n10_raw.json \
 *          load_test/claim_race.k6.js
 *
 *   # 3. clean up
 *   npx tsx load_test/teardown.ts
 *
 * Barrier strategy:
 *   We simulate "t=0" using k6's `shared-iterations` executor with a
 *   single iteration per VU and `startTime: 0s`. The `vu.idInTest`-based
 *   spin-until-wall-clock barrier keeps VUs aligned within ~5ms on a
 *   local runner. For tighter alignment run k6 --paused and resume.
 */

import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";
import { Counter, Trend } from "k6/metrics";

// --- Data load (JWT pool + target task id) --------------------------------

const tokens = new SharedArray("tokens", () =>
  JSON.parse(open("./jwts.json")),
);
const task = new SharedArray("task", () => [JSON.parse(open("./task.json"))])[0];

const N = Number(__ENV.N || 10);
if (tokens.length < N) {
  throw new Error(
    `jwts.json has ${tokens.length} tokens but N=${N}; run prepare-jwts first`,
  );
}

// --- k6 options ----------------------------------------------------------

export const options = {
  scenarios: {
    race: {
      executor: "shared-iterations",
      vus: N,
      iterations: N,
      maxDuration: "60s",
    },
  },
  thresholds: {
    "claim_success_total": [`count==1`],
    "claim_already_taken_total": [`count==${N - 1}`],
  },
};

// --- Custom metrics ------------------------------------------------------

const successCounter = new Counter("claim_success_total");
const alreadyTakenCounter = new Counter("claim_already_taken_total");
const otherErrorCounter = new Counter("claim_other_error_total");
const winnerLatency = new Trend("claim_winner_duration_ms", true);
const loserLatency = new Trend("claim_loser_duration_ms", true);

// --- Barrier: wait until wall-clock startAt before firing. ---------------
// All VUs compute the same target in setup() and spin-wait to align.

export function setup() {
  // Schedule the race ~1500ms into the future so even the last-spawned VU
  // has time to reach its pre-barrier spin loop.
  return {
    url: `${__ENV.SUPABASE_URL}/rest/v1/rpc/claim_delivery_task`,
    anonKey: __ENV.SUPABASE_ANON_KEY,
    taskId: task.id,
    startAt: Date.now() + 1500,
  };
}

export default function (data) {
  // Each VU gets a unique token slot (1-indexed VU id).
  const token = tokens[(__VU - 1) % tokens.length].token;

  // Busy-wait barrier: tighter than sleep() at sub-second granularity.
  while (Date.now() < data.startAt) {
    // spin; no-op
  }

  const t0 = Date.now();
  const res = http.post(
    data.url,
    JSON.stringify({ p_task_id: data.taskId }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: data.anonKey,
        Authorization: `Bearer ${token}`,
      },
      tags: { vu: String(__VU) },
    },
  );
  const elapsed = Date.now() - t0;

  // claim_delivery_task returns a jsonb payload: { success, message, task? }
  let body = null;
  try {
    body = res.json();
  } catch {
    body = null;
  }

  const isSuccess = body && body.success === true;
  const isAlreadyTaken =
    body &&
    body.success === false &&
    /(already|taken|assigned|not available)/i.test(body.message || "");

  if (isSuccess) {
    successCounter.add(1);
    winnerLatency.add(elapsed);
  } else if (isAlreadyTaken) {
    alreadyTakenCounter.add(1);
    loserLatency.add(elapsed);
  } else {
    otherErrorCounter.add(1);
    console.error(
      `VU ${__VU} unexpected response status=${res.status} body=${res.body}`,
    );
  }

  check(res, {
    "200 OK": (r) => r.status === 200,
    "well-formed claim response": () => body !== null,
  });
}

// No teardown; handled by the Node teardown.ts script so cleanup runs even
// if k6 crashes.
