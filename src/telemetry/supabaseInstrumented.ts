import { supabase } from "../config/supabaseClient";
import { recordMetric } from "./rpcLogger";
import { measureRpc, setTelemetryListener } from "./rpcTelemetry";

/**
 * Installs the telemetry pipeline:
 *   1. Subscribes the AsyncStorage logger to every measured metric.
 *   2. Monkey-patches supabase.rpc() to time every call transparently.
 *
 * Call once, as early as possible (before the first RPC). Idempotent.
 *
 * Rationale for a runtime patch vs. "wrap every call-site":
 *  - Guaranteed coverage: new services get instrumentation for free.
 *  - Central opt-out: set EXPO_PUBLIC_TELEMETRY=off to disable without code
 *    changes.
 *  - Preserves the returned PostgrestBuilder/Promise contract — we await the
 *    response, then re-hydrate it as a resolved Promise so .then/.select/etc
 *    still work for callers that don't immediately await.
 */

let installed = false;

export function installTelemetry(): void {
  if (installed) return;
  installed = true;

  // 1. route every metric into the persistent FIFO.
  setTelemetryListener(recordMetric);

  // 2. patch supabase.rpc. The SDK returns a thenable builder; we intercept
  //    the .then call so that .select/.single chains on top of rpc() still
  //    route through measurement.
  const original = supabase.rpc.bind(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).rpc = (fn: string, args?: unknown, opts?: unknown) => {
    const builder = original(fn as never, args as never, opts as never);
    const originalThen = builder.then.bind(builder);

    // Replace .then so awaiting the builder goes through measureRpc.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (builder as any).then = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onFulfilled?: (value: any) => any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onRejected?: (reason: any) => any,
    ) => {
      return measureRpc(fn, () =>
        new Promise((res, rej) => originalThen(res, rej)),
      ).then(onFulfilled, onRejected);
    };

    return builder;
  };
}

/**
 * Uninstall — used by tests only. Does NOT un-patch supabase.rpc.
 */
export function __TESTING_isInstalled(): boolean {
  return installed;
}
