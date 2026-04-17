/**
 * Production safety fence.
 *
 * This is a destructive-adjacent test suite — it inserts tasks, forges OTPs,
 * and deliberately triggers 1000+ bcrypt calls. A misconfigured .env pointing
 * at production would corrupt real deliveries.
 *
 * assertStaging() runs 3 independent checks:
 *   1. NODE_ENV must not be "production"
 *   2. SUPABASE_URL must not equal SUPABASE_PROD_URL (exact-match fence)
 *   3. SUPABASE_URL hostname must contain "staging" / "dev" / "test" OR the
 *      operator must pass --force-non-staging-name  (explicit opt-in, used
 *      when the staging project lacks a clear hostname tag)
 *
 * Any failure → process.exit(1) before any DB connection opens.
 */

export function assertStaging(argv: string[] = process.argv): void {
  const reasons: string[] = [];

  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  if (nodeEnv === "production") {
    reasons.push(`NODE_ENV="${nodeEnv}" — this suite MUST NOT run in production`);
  }

  const url = process.env.SUPABASE_URL?.trim();
  const prodUrl = process.env.SUPABASE_PROD_URL?.trim();

  if (!url) {
    reasons.push("SUPABASE_URL is not set");
  } else if (/<[^>]+>/.test(url)) {
    reasons.push(
      `SUPABASE_URL still contains placeholder text "${url}" — edit .env and paste the real staging URL`,
    );
  } else if (prodUrl && url === prodUrl) {
    reasons.push(
      `SUPABASE_URL matches SUPABASE_PROD_URL (${url}) — production fence triggered`,
    );
  }

  for (const key of [
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "BENCH_COURIER_EMAIL",
    "BENCH_COURIER_PASSWORD",
  ]) {
    const v = process.env[key];
    if (!v) {
      reasons.push(`${key} is not set`);
    } else if (/<[^>]+>/.test(v)) {
      reasons.push(`${key} still contains placeholder text "${v}"`);
    }
  }

  if (url && !/<[^>]+>/.test(url)) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const hasStagingHint = /(staging|dev|test|preview|local)/i.test(hostname);
      const forced = argv.includes("--force-non-staging-name");
      if (!hasStagingHint && !forced) {
        reasons.push(
          `SUPABASE_URL hostname "${hostname}" does not contain a staging hint. ` +
            `Pass --force-non-staging-name to override if you're sure.`,
        );
      }
    } catch {
      reasons.push(`SUPABASE_URL="${url}" is not a valid URL`);
    }
  }

  if (reasons.length > 0) {
    console.error("\n[ABORT] Staging-only check failed:");
    for (const r of reasons) console.error("  - " + r);
    console.error(
      "\nFix the above and retry. The test was NOT run — no data was touched.\n",
    );
    process.exit(1);
  }
}
