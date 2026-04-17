#!/usr/bin/env bash
# Runs the 4 concurrency scenarios end-to-end: create-task → k6 → teardown.
# Writes results to benchmarks/results/claim_race_n{N}_{summary,raw}.json.
#
# Usage (from benchmarks/ dir):
#   ./load_test/run_all.sh
#
# Requirements:
#   - k6 installed (brew install k6 / apt install k6)
#   - npm install done in benchmarks/
#   - .env populated
#   - load_test/jwts.json has at least 200 entries (run prepare-jwts)

set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p results

if [ ! -f load_test/jwts.json ]; then
  echo "! jwts.json missing — run 'npm run prepare-jwts' first" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

for N in 10 50 100 200; do
  echo ""
  echo "===== Scenario N=$N ====="

  npx tsx load_test/create_task.ts

  k6 run \
    -e "N=$N" \
    -e "SUPABASE_URL=$SUPABASE_URL" \
    -e "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" \
    --summary-export="results/claim_race_n${N}_summary.json" \
    --out "json=results/claim_race_n${N}_raw.json" \
    load_test/claim_race.k6.js || echo "k6 exited non-zero (threshold fail?) — continuing"

  npx tsx load_test/teardown.ts
done

echo ""
echo "Done. Results:"
ls -1 results/claim_race_n*.json
