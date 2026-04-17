export {
  measureRpc,
  withRpcTelemetry,
  setTelemetryListener,
  getDeviceId,
  getNetworkType,
} from "./rpcTelemetry";
export type { RpcMetric, RpcStatus } from "./rpcTelemetry";

export {
  recordMetric,
  getRecentMetrics,
  getRecentMetricsSync,
  subscribeToMetrics,
  clearMetrics,
  serialiseMetrics,
} from "./rpcLogger";

export { installTelemetry } from "./supabaseInstrumented";
