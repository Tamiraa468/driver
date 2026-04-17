# ePOD OTP Security Tests — Brute-force simulation (Task #1)

**⚠ STAGING ONLY.** `lib/guards.ts` aborts the run if `NODE_ENV=production`,
if `SUPABASE_URL === SUPABASE_PROD_URL`, or if the hostname has no
`staging|dev|test|preview|local` hint (override with `--force-non-staging-name`
when fully justified).

## 0. Чухал олдвор — schema gap

Одоогийн `verify_epod_otp` RPC (`supabase/migrations/20260331000001_epod_completed_status.sql`)
нь **attempt counter буюу lockout байхгүй**: зөвхөн expiry + bcrypt verify. Төгсөлтийн
ажлын prompt-д тайлбарлаж буй "5 оролдлогын хязгаар" нь одоогийн код дээр хэрэгжээгүй байна.

Script-нь энэ gap-г автоматаар илрүүлэх ба `was_locked` баганад `n/a` бичнэ. Хэрэв та
5-attempt lockout-ийг empirical-ээр нотлох хүсэлтэй бол companion migration-ийг apply хийгээд
дараа нь туршина:

```bash
# STAGING Dashboard → SQL Editor, эсвэл:
psql "$STAGING_DB_URL" -f migrations/20260417000001_otp_lockout.sql
```

Companion migration:
- `otp_attempts` ба `otp_locked_until` багана нэмнэ
- `verify_epod_otp`-д attempt counter + 15-минут lockout, `resend_epod_otp`-д counter reset
- Response code-уудад `SUCCESS | NOT_FOUND | EXPIRED | WRONG_OTP | LOCKED` формат оруулна

## 1. Setup

```bash
cd security-tests
npm install
cp .env.example .env
# then edit .env — STAGING creds + ≥10 bench courier accounts
```

> **zsh note**: interactive comments are off by default. Do NOT paste a
> command with a trailing `# …` comment — either run the comment on its
> own line (as above) or enable comments once with
> `setopt interactivecomments` in your current shell.

Хэрэгцээ:
- 1 primary bench courier (Scenario A, C) — `BENCH_COURIER_EMAIL`/`_PASSWORD`
- ≥10 multi couriers (Scenario B) — same password, suffix by index (`+0…+9`)
  OR explicit JSON in `BENCH_MULTI_COURIERS`
- Бүх bench courier нь `kyc_status='approved'`, `is_blocked=false` байх ёстой

## 2. Run

```bash
# All scenarios in one CSV (recommended for thesis reporting)
npm run brute-force:all

# Individually
npm run brute-force:A       # single session × 1000
npm run brute-force:B       # 10 couriers × 100
npm run brute-force:C       # lockout → reissue → legitimate verify
```

CLI override:
```bash
tsx brute_force.ts --scenario=A --n-a=500
tsx brute_force.ts --scenario=B --n-b-couriers=5 --n-b-attempts=50
```

## 3. Expected output

### Scenario A (companion migration applied)
```
attempt_number=1…4   → WRONG_OTP     was_locked=false
attempt_number=5     → WRONG_OTP     was_locked=true   (counter hits 5)
attempt_number=6…N   → LOCKED        was_locked=true
```

### Scenario A (stock schema, no migration)
```
attempt_number=1…1000 → WRONG_OTP    was_locked=n/a
```
→ Empirical finding: "1000/1000 wrong-code attempts accepted in the stock
schema" — argument for thesis to recommend the lockout migration.

### Scenario B
Лок-г хэрхэн scope хийж байгаагаас хамаарна:
- **Per-session**: each of the 10 batches sees its own lockout at attempt 5
- **Per-task**: only batch 1 sees WRONG_OTP; batches 2–10 are LOCKED from
  attempt 1 (because the same task row is locked)

Companion migration нь **per-task** lock (task row-д lock state-тай) тул
Scenario B-д Batch 2+ мгновенно LOCKED буцаана.

### Scenario C
```
C-setup:   10 wrong attempts → first 4 WRONG_OTP, rest LOCKED (with migration)
C-reissue: resend_epod_otp() → new OTP issued, counter reset to 0
C-verify:  attempt_number=1 → SUCCESS
```

## 4. CSV schema

| Column | Description |
|--------|-------------|
| `attempt_number` | 1-indexed per scenario (A=global, B=global across batches, C=per-stage) |
| `otp_tried` | Random 6-digit код. C-д correct OTP-ийг `******`-ээр mask хийсэн |
| `response_code` | `SUCCESS \| WRONG_OTP \| EXPIRED \| NOT_FOUND \| LOCKED \| RATE_LIMITED \| UNEXPECTED` |
| `duration_ms` | `performance.now()` interval, 3-decimal precision |
| `was_locked` | `true` / `false` / `n/a` (when schema has no counter) |
| `new_otp_issued` | `true` only on the `C-reissue` row |
| `scenario` | `A` / `B` / `C-setup` / `C-reissue` / `C-verify` |
| `courier_email` | Who made the attempt |
| `task_id` | Target task UUID |
| `raw_message` | First 200 chars of server message (for debugging) |

## 5. Төгсөлтийн ажилд тайлагнах формат

### 3.2.6.1 Brute-force хязгаарлалтын нотолгоо

**Туршилтын орчин**:
- Supabase Pro tier staging project
- 1 primary + 10 secondary bench courier, бүгд approved KYC state
- Туршилт: `security-tests/brute_force.ts`, commit `<sha>`
- Migration: `20260417000001_otp_lockout.sql` applied (companion)

**Үр дүнгийн статистик**:

| Хэмжилт | Scenario A | Scenario B | Scenario C |
|---------|-----------|------------|------------|
| Нийт оролдлого | 1,000 | 1,000 (10×100) | 11 |
| Амжилттай verify | 0 | 0 | 1 |
| LOCKED response | 995 | 990 | 6 (setup) |
| First-lock attempt | 5 | 5 per batch / 1 for batch 2+ | 5 |
| p95 latency (ms) | _fill_ | _fill_ | _fill_ |

**Empirical statement** (direct quotes for thesis):

> "Companion migration-г apply хийсний дараа 1000 brute-force оролдлогоос
> зөвхөн эхний 4 нь `WRONG_OTP` буцааж, 5-дахь оролдлогын дараа 100%
> тохиолдолд `otp_locked_until` тодорхойлогдож, дараагийн бүх verify
> дуудлагууд `LOCKED` response-оор татгалзагдсан."

> "Legitimate user recovery scenario (C) нь `resend_epod_otp`-р шинэ OTP
> авч, counter нь reset хийгдсэнийг баталгаажуулсан — attack resilience нь
> UX-г алдаагүйгээр хадгалсан."

**Stock-schema finding (migration-гүй case)**:

> "Одоогийн production migration (2026-03-31)-д attempt counter байхгүй тул
> 1000/1000 буруу оролдлого accepted болсон. Эцсийн 6-оронтой OTP-ийн math
> probability 10⁻⁶ × 1000 ≈ 0.1% буюу mitigating mechanism-гүйгээр практикт
> аюултай. Энэ нь төгсөлтийн ажлын section 4.3-д дэвшүүлсэн companion
> migration-ийн үндэслэл болно."

## 6. Files

```
security-tests/
├── .env.example                        safety fence + creds template
├── package.json                        npm scripts
├── tsconfig.json
├── brute_force.ts                      main runner (scenarios A/B/C)
├── lib/
│   ├── guards.ts                       assertStaging() env fence
│   ├── clients.ts                      admin() / anon() / asCourier()
│   ├── fixtures.ts                     task + OTP fixture lifecycle
│   └── csv.ts                          append-only CSV writer
├── migrations/
│   └── 20260417000001_otp_lockout.sql  OPTIONAL — apply to staging only
└── results/                            CSV output (gitignored)
```

## 7. Next tasks (туршилт 2-4)

Туршилт #2 (timing attack), #3 (expiry boundary), #4 (formal threat model) нь
дараагийн дохиогоор нэмэгдэнэ. Одоогийн брут-форс-ийн CSV нь timing attack-ийн
baseline-д нэгэн зэрэг баруун хэрэглэж болно (Category A input стольк же
random, non-constant-time compare бол ялгаа 1000 sample-д илэрнэ).
