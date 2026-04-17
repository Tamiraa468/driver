import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// expo-application & NetInfo are OPTIONAL — loaded lazily so the instrumentation
// keeps working in benchmark/node environments where these modules are absent.
let AppModule: typeof import("expo-application") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppModule = require("expo-application");
} catch {
  AppModule = null;
}

type NetInfoLike = {
  addEventListener: (cb: (s: { type?: string }) => void) => void;
  fetch: () => Promise<{ type?: string }>;
};
let NetInfo: NetInfoLike | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NetInfo = require("@react-native-community/netinfo").default ?? null;
} catch {
  NetInfo = null;
}

/**
 * RPC telemetry primitives.
 *
 * Production-grade timing wrapper for Supabase RPC (and any async) calls.
 * Designed to add <0.5ms overhead per call and ~1KB of retained memory per
 * 100 samples (see docs/telemetry.md).
 *
 * Public API:
 *   - measureRpc(name, fn)           : instrument one call
 *   - withRpcTelemetry(name, fn)     : higher-order wrapper
 *   - setTelemetryListener(cb)       : subscribe to every recorded metric
 *   - getDeviceId() / getNetworkType() : auxiliary context providers
 */

export type RpcStatus = "success" | "error";

export interface RpcMetric {
  /** RPC name as passed to supabase.rpc(name, ...) */
  rpc_name: string;
  /** Wall-clock duration (ms) from start to settle — performance.now() based */
  duration_ms: number;
  /** success if the promise resolved without a Supabase error, else error */
  status: RpcStatus;
  /** Supabase error.code or JS error.name; undefined on success */
  error_code?: string;
  /** ISO-8601 timestamp captured at call start */
  timestamp: string;
  /** "wifi" | "cellular" | "unknown" | "none" — cached from NetInfo */
  network_type: string;
  /** Stable per-install device id (expo-application) */
  device_id: string;
}

type Listener = (m: RpcMetric) => void;

const listeners = new Set<Listener>();

export function setTelemetryListener(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(metric: RpcMetric) {
  for (const l of listeners) {
    try {
      l(metric);
    } catch {
      // listener errors must never affect the measured call
    }
  }
}

// -------- Device id (stable per install) ----------------------------------

const DEVICE_ID_KEY = "telemetry.device_id";
let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  // expo-application gives a per-install id on iOS; Android uses the
  // Installation id. Fall back to a generated one stored in AsyncStorage.
  let native: string | null = null;
  if (AppModule) {
    native =
      Platform.OS === "ios"
        ? await AppModule.getIosIdForVendorAsync().catch(() => null)
        : AppModule.getAndroidId();
  }
  if (native) {
    cachedDeviceId = native;
    return native;
  }
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const generated = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  cachedDeviceId = generated;
  return generated;
}

// -------- Network type (cached with NetInfo listener) ---------------------

let cachedNetwork: string = "unknown";

function mapNetworkType(state: { type?: string }): string {
  const t = state.type;
  if (t === "wifi" || t === "cellular" || t === "none") return t;
  return t ?? "unknown";
}

// Subscribe once — lazy, idempotent.
let netSubscribed = false;
function ensureNetSubscription() {
  if (netSubscribed || !NetInfo) return;
  netSubscribed = true;
  NetInfo.addEventListener((s) => {
    cachedNetwork = mapNetworkType(s);
  });
  NetInfo.fetch()
    .then((s) => {
      cachedNetwork = mapNetworkType(s);
    })
    .catch(() => {
      /* non-fatal */
    });
}

export function getNetworkType(): string {
  ensureNetSubscription();
  return cachedNetwork;
}

// -------- Core timing primitive ------------------------------------------

/**
 * Supabase response shape we care about. We intentionally do not import the
 * SDK type to keep this module dependency-light (and testable in Node).
 */
interface SupabaseLikeResponse<T> {
  data: T | null;
  error: { code?: string; message?: string; name?: string } | null;
}

/**
 * Wraps a Promise<SupabaseLikeResponse> and records timing. The original
 * response is returned unchanged — instrumentation is fully transparent.
 */
export async function measureRpc<T>(
  rpcName: string,
  invoker: () => Promise<SupabaseLikeResponse<T>>,
): Promise<SupabaseLikeResponse<T>> {
  ensureNetSubscription();
  const startedAt = new Date().toISOString();
  // performance.now is monotonic and unaffected by clock skew.
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  let response: SupabaseLikeResponse<T>;
  let thrown: unknown = null;
  try {
    response = await invoker();
  } catch (err) {
    thrown = err;
    response = {
      data: null,
      error: {
        code: (err as { code?: string })?.code,
        message: (err as Error)?.message,
        name: (err as Error)?.name ?? "Error",
      },
    };
  }
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const duration_ms = Math.round((t1 - t0) * 1000) / 1000;

  const metric: RpcMetric = {
    rpc_name: rpcName,
    duration_ms,
    status: response.error ? "error" : "success",
    error_code:
      response.error?.code ??
      response.error?.name ??
      (response.error ? "unknown" : undefined),
    timestamp: startedAt,
    network_type: cachedNetwork,
    device_id: cachedDeviceId ?? "pending",
  };

  // Resolve device id in the background on first call — do not block RPC.
  if (!cachedDeviceId) {
    getDeviceId()
      .then((id) => {
        metric.device_id = id;
      })
      .catch(() => {
        /* non-fatal */
      });
  }

  emit(metric);

  if (thrown) throw thrown;
  return response;
}

/**
 * Higher-order wrapper variant: ideal for wrapping existing service
 * functions without touching each call-site.
 *
 *   export const claimDeliveryTask = withRpcTelemetry(
 *     "claim_delivery_task",
 *     claimDeliveryTaskImpl,
 *   );
 */
export function withRpcTelemetry<Args extends unknown[], T>(
  rpcName: string,
  fn: (...args: Args) => Promise<SupabaseLikeResponse<T>>,
): (...args: Args) => Promise<SupabaseLikeResponse<T>> {
  return (...args: Args) => measureRpc(rpcName, () => fn(...args));
}
