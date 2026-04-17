import AsyncStorage from "@react-native-async-storage/async-storage";
import { RpcMetric } from "./rpcTelemetry";

/**
 * Persistent, bounded ring buffer for RPC metrics.
 *
 * Design choices:
 *  - Key: "telemetry.rpc.log.v1"   (versioned → safe to bump schema)
 *  - Format: JSON array, newest last. Kept human-readable for Export-to-JSON.
 *  - Eviction: FIFO, capped at MAX_ENTRIES (100). Older entries dropped.
 *  - Write policy: debounced flush to AsyncStorage (avoids a disk write per
 *    RPC call during burst traffic). In-memory ring is always current.
 *  - Sensitive-data filter: a deny-list scrubs any fields that could leak
 *    JWTs or OTP codes even if they accidentally land in an error payload.
 */

const STORAGE_KEY = "telemetry.rpc.log.v1";
const MAX_ENTRIES = 100;
const FLUSH_DEBOUNCE_MS = 500;

// Case-insensitive token fragments we never want to persist, even in error
// messages. Any string field containing one of these is replaced with
// "[REDACTED]" in a shallow copy of the metric before it hits disk.
const SENSITIVE_TOKENS = [
  "bearer ",
  "authorization",
  "access_token",
  "refresh_token",
  "apikey",
  "api_key",
  "jwt",
  "otp",
  "otp_plain",
  "otp_code",
  "password",
  "secret",
];

// ---------- In-memory ring ------------------------------------------------

let ring: RpcMetric[] = [];
let hydrated = false;
let hydratingPromise: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<(snapshot: RpcMetric[]) => void>();

function notify() {
  // Snapshot (defensive copy) so subscribers cannot mutate the ring.
  const snap = ring.slice();
  for (const sub of subscribers) {
    try {
      sub(snap);
    } catch {
      /* ignore */
    }
  }
}

// ---------- Redaction helper ---------------------------------------------

function containsSensitive(value: string): boolean {
  const lower = value.toLowerCase();
  return SENSITIVE_TOKENS.some((t) => lower.includes(t));
}

function redact(metric: RpcMetric): RpcMetric {
  const copy: RpcMetric = { ...metric };
  // error_code can be arbitrary upstream text — scrub it.
  if (copy.error_code && containsSensitive(copy.error_code)) {
    copy.error_code = "[REDACTED]";
  }
  // rpc_name is a static identifier — should never contain secrets, but check.
  if (containsSensitive(copy.rpc_name)) {
    copy.rpc_name = "[REDACTED]";
  }
  return copy;
}

// ---------- Hydration ------------------------------------------------------

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (hydratingPromise) return hydratingPromise;
  hydratingPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          ring = parsed.slice(-MAX_ENTRIES);
        }
      }
    } catch {
      ring = [];
    } finally {
      hydrated = true;
      hydratingPromise = null;
    }
  })();
  return hydratingPromise;
}

// Fire-and-forget hydration on import so first read is fast.
void hydrate();

// ---------- Flushing ------------------------------------------------------

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ring)).catch(() => {
      // Storage failures must not crash the app; the ring stays in memory.
    });
  }, FLUSH_DEBOUNCE_MS);
}

// ---------- Public API ----------------------------------------------------

export function recordMetric(metric: RpcMetric): void {
  const safe = redact(metric);
  ring.push(safe);
  if (ring.length > MAX_ENTRIES) {
    ring.splice(0, ring.length - MAX_ENTRIES);
  }
  notify();
  scheduleFlush();
}

export async function getRecentMetrics(): Promise<RpcMetric[]> {
  await hydrate();
  return ring.slice();
}

/** Synchronous variant — returns the current in-memory snapshot without
 *  waiting for hydration. Safe to call from a React render (hook below uses
 *  this after the subscription fires). */
export function getRecentMetricsSync(): RpcMetric[] {
  return ring.slice();
}

export function subscribeToMetrics(
  listener: (metrics: RpcMetric[]) => void,
): () => void {
  subscribers.add(listener);
  listener(ring.slice());
  return () => {
    subscribers.delete(listener);
  };
}

export async function clearMetrics(): Promise<void> {
  ring = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  notify();
}

/** For tests / benchmarks — serialises to a JSON string identical to what
 *  would be exported via Share. */
export function serialiseMetrics(): string {
  return JSON.stringify(ring, null, 2);
}
