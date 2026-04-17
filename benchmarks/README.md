# Courier backend benchmarks & load tests

Төгсөлтийн ажилд зориулсан empirical measurement pipeline. 3 үе шат:
**(1) in-app telemetry → (2) Node benchmark → (3) k6 concurrent load → (4) Python analysis.**

## 0. Нэг удаагийн setup

```bash
# macOS
brew install k6
python3 -m pip install -r ../analysis/requirements.txt

# benchmarks package
cd benchmarks
npm install
cp .env.example .env     # fill SUPABASE_URL, ANON, SERVICE_ROLE, BENCH_USER_*
```

`service_role` key-г GitHub-д `push` хийхгүй байх нь чухал — `.gitignore`-д
`benchmarks/.env` нь аль хэдийн орсон байх ёстой (шалгаарай).

Also install the optional runtime deps used by `src/telemetry`:

```bash
# from repo root
npx expo install expo-application expo-sharing @react-native-community/netinfo
```

## 1. In-app RPC telemetry (`src/telemetry/*`)

Автоматаар `App.tsx` дээр идэвхжиж, `supabase.rpc()` дуудлага бүрийг
гуйлгана (opt-out: `EXPO_PUBLIC_TELEMETRY=off`).

- `rpcTelemetry.ts` — `measureRpc()`, `withRpcTelemetry()` HOF
- `rpcLogger.ts` — AsyncStorage FIFO буфер (100 entry)
- `supabaseInstrumented.ts` — `supabase.rpc` monkey-patch
- `screens/dev/RpcDebugScreen.tsx` — `__DEV__`-д л харагдана; percentile panel,
  Clear, Export (Expo Sharing) товчлуур бүхий
- `DebugHotspot` — 3 удаа tap хийхэд RpcDebug screen нээгддэг заавар газар

### Debug screen-г нээх 2 арга

1. **Navigation**: `navigation.navigate("RpcDebug")` (screen is only
   registered in the stack when `__DEV__` is true — see
   `CourierRootNavigator.tsx`).
2. **Hidden hotspot**: any screen can mount
   `<DebugHotspot onOpen={() => navigation.navigate("RpcDebug")} />` — 3
   quick taps on the invisible top-right corner opens it.

## 2. Benchmark: `get_available_tasks` (Task 4)

```bash
cd benchmarks
npm run seed                     # inserts ~60 published tasks (idempotent tag)
npm run bench:get-available      # 2 passes × (10 warm-up + 100 measured)
```

Гаралт:

- `results/get_available_tasks.csv` — summary per role
- `results/get_available_tasks_raw.csv` — 200 raw sample (100 × 2 role)

## 3. Concurrent claim load test (Task 5)

```bash
npm run prepare-jwts -- --n=200   # provision 200 pre-authenticated couriers
./load_test/run_all.sh            # 10 → 50 → 100 → 200 scenarios
```

Сценари тус бүрт `claim_race_n{N}_summary.json` ба `_raw.json` үүснэ.

**Assertion-ууд** (k6 thresholds блок):
- `claim_success_total == 1` — зөвхөн нэг courier амжилттай
- `claim_already_taken_total == N-1` — бусад бүгд reject хийгдсэн

Threshold амжилтгүй бол k6 non-zero exit хийнэ, гэхдээ `run_all.sh` гэмтэл
тусгаарлаж бусад сценариуд үргэлжлүүлнэ — тайланд оруулахад хэрэгтэй.

## 4. Analysis + LaTeX (Task 6)

```bash
cd analysis
python analyze_results.py --bench-dir ../benchmarks/results --out-dir ./out
```

Гаралт `analysis/out/`:

| Файл | Агуулга |
|------|---------|
| `fig_latency_hist.png` | `get_available_tasks` latency histogram (RLS vs service_role) |
| `fig_concurrency_vs_p95.png` | N vs p95 latency line chart (winner + loser) |
| `fig_success_rate.png` | 3-bar grouped bar: success / already-taken / other-error |
| `summary.csv` | N, p50, p95, p99, success/taken/error counts |
| `results.tex` | `\input`-ready LaTeX fragment (table + figures) |

Thesis-дээ тухайн section-д:
```latex
\input{../../analysis/out/results.tex}
```

## 5. Cleanup

```bash
npx tsx load_test/teardown.ts              # delete race tasks + bench seed rows
npx tsx load_test/teardown.ts -- --users   # ALSO delete bench courier users
```

## Тайлангийн формат (санал)

Төгсөлтийн ажилд дараах байдлаар танилцуулахыг зөвлөж байна:

1. **RPC latency хүснэгт** — `get_available_tasks` RLS vs service_role; онцлох
   үзүүлэлт: p95 (тууштай endpoint-ийн хувьд ≤150ms хүрэх зорилттой).
2. **Concurrency scalability график** — N∈{10,50,100,200} vs p95 latency
   (winner). `FOR UPDATE SKIP LOCKED`-ийн үр дүн: latency бараг тогтмол байх
   ёстой.
3. **Correctness bar chart** — бүх сценариудад success=1 байсныг нүдээр нь
   харуулна (race condition хамгаалалтын empirical нотолгоо).
4. **Өгөгдөл ба аргачлал** — PostgreSQL 15, PgBouncer transaction mode,
   Supabase Pro tier, k6 v0.x, measurement орчин (WiFi + симулятор), sample
   size N=100.
5. **Хязгаарлалтууд** — WiFi jitter, Supabase Pro tier-ийн shared infra, test
   user KYC state, JWT expiry.

### Аль хэмжилтийг онцлох вэ

| Хэмжилт | Яагаад чухал |
|---------|-------------|
| `get_available_tasks p95` | Homescreen ачааллын (load) үзүүлэлт — UX тэсвэрлэх босго ~200ms |
| `claim_delivery_task winner p95` | "Claim хийхэд хэдийн удах вэ" — courier-ийн perceive хугацаа |
| `success_count / N` | Бүртгэлийн зөв байдал (correctness) — concurrent claim race condition-ийн empirical баталгаа |
| `loser p95 − winner p95` | `SKIP LOCKED` lock-contention overhead-ийн шууд үзүүлэлт |
