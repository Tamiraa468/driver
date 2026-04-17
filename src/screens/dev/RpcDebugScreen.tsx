import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from "../../constants/design";
import {
  RpcMetric,
  clearMetrics,
  serialiseMetrics,
  subscribeToMetrics,
} from "../../telemetry";

/**
 * Development-only RPC latency debug panel.
 *
 * Gate: renders nothing unless __DEV__ is true. The bundler does not tree-
 * shake this file out of prod automatically, so we also make every side-effect
 * (subscribe, export) dependent on the __DEV__ guard.
 *
 * Access: expected to be mounted from CourierRootNavigator behind a hidden
 * gesture (e.g. the 3-tap hotspot exported below) or as a Navigator screen
 * named "RpcDebug".
 */

// ---------------------------------------------------------------------------
// Pure stats helpers — easily unit-testable.
// ---------------------------------------------------------------------------

interface PerRpcStats {
  rpc_name: string;
  count: number;
  error_count: number;
  p50: number;
  p95: number;
  p99: number;
}

/** Nearest-rank percentile (cheap, deterministic). Input must be sorted asc. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1];
}

export function computeStats(metrics: RpcMetric[]): PerRpcStats[] {
  const buckets = new Map<string, RpcMetric[]>();
  for (const m of metrics) {
    const existing = buckets.get(m.rpc_name);
    if (existing) existing.push(m);
    else buckets.set(m.rpc_name, [m]);
  }
  return [...buckets.entries()]
    .map(([name, samples]) => {
      const durs = samples
        .map((s) => s.duration_ms)
        .sort((a, b) => a - b);
      return {
        rpc_name: name,
        count: samples.length,
        error_count: samples.filter((s) => s.status === "error").length,
        p50: percentile(durs, 50),
        p95: percentile(durs, 95),
        p99: percentile(durs, 99),
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const RpcDebugScreen: React.FC = () => {
  const [metrics, setMetrics] = useState<RpcMetric[]>([]);

  useEffect(() => {
    if (!__DEV__) return;
    return subscribeToMetrics(setMetrics);
  }, []);

  const stats = useMemo(() => computeStats(metrics), [metrics]);
  const overall = useMemo(() => {
    const total = metrics.length;
    const errors = metrics.filter((m) => m.status === "error").length;
    return {
      total,
      errors,
      errorRate: total === 0 ? 0 : (errors / total) * 100,
    };
  }, [metrics]);

  if (!__DEV__) {
    // Hard gate in prod builds — defensive even if routed to accidentally.
    return null;
  }

  const onClear = () => {
    Alert.alert("Цэвэрлэх", "Бүх RPC log устгах уу?", [
      { text: "Үгүй", style: "cancel" },
      {
        text: "Тийм",
        style: "destructive",
        onPress: () => {
          void clearMetrics();
        },
      },
    ]);
  };

  const onExport = async () => {
    try {
      const json = serialiseMetrics();
      const filename = `rpc-log-${Date.now()}.json`;
      // FileSystem.cacheDirectory is writable on iOS/Android; on web we fall
      // back to a copy-to-clipboard Alert.
      if (Platform.OS === "web") {
        Alert.alert("Web орчинд", "JSON консолд хэвлэлээ.");
        // eslint-disable-next-line no-console
        console.log(json);
        return;
      }
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "RPC log хуваалцах",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Хадгалсан", uri);
      }
    } catch (err) {
      Alert.alert("Алдаа", (err as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>RPC Telemetry</Text>
        <Text style={styles.subtitle}>
          {overall.total} дуудлага · {overall.errors} алдаа ·{" "}
          {overall.errorRate.toFixed(1)}%
        </Text>
      </View>

      {stats.length > 0 && (
        <View style={styles.statsPanel}>
          <Text style={styles.sectionTitle}>Percentiles (ms)</Text>
          {stats.map((s) => (
            <View key={s.rpc_name} style={styles.statRow}>
              <Text style={styles.statName} numberOfLines={1}>
                {s.rpc_name}
              </Text>
              <Text style={styles.statCell}>n={s.count}</Text>
              <Text style={styles.statCell}>p50={s.p50.toFixed(1)}</Text>
              <Text style={styles.statCell}>p95={s.p95.toFixed(1)}</Text>
              <Text style={styles.statCell}>p99={s.p99.toFixed(1)}</Text>
              {s.error_count > 0 && (
                <Text style={[styles.statCell, styles.errCell]}>
                  err={s.error_count}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={metrics.slice().reverse()}
        keyExtractor={(m, i) => `${m.timestamp}-${i}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.logRow,
              item.status === "error" && styles.logRowError,
            ]}
          >
            <Text style={styles.logRpc} numberOfLines={1}>
              {item.rpc_name}
            </Text>
            <Text style={styles.logDur}>{item.duration_ms.toFixed(1)}ms</Text>
            <Text style={styles.logStatus}>
              {item.status === "success" ? "✓" : "✗"}
            </Text>
            <Text style={styles.logTime}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Дуудлага бүртгэгдсэнгүй. Апп ашиглаад буцаж ирээрэй.
          </Text>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={onClear}>
          <Text style={styles.btnText}>Цэвэрлэх</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={onExport}
        >
          <Text style={[styles.btnText, styles.btnTextPrimary]}>
            JSON экспорт
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// 3-tap hidden entry hotspot — compose with any screen to open the debug view.
// Example:
//   <DebugHotspot onOpen={() => navigation.navigate("RpcDebug")} />
// ---------------------------------------------------------------------------

export const DebugHotspot: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const [taps, setTaps] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  if (!__DEV__) return null;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.hotspot}
      onPress={() => {
        const now = Date.now();
        const next = now - lastTap < 600 ? taps + 1 : 1;
        setTaps(next);
        setLastTap(now);
        if (next >= 3) {
          setTaps(0);
          onOpen();
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md, paddingBottom: Spacing.sm },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsPanel: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    gap: 8,
  },
  statName: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  statCell: {
    fontSize: FontSize.xs,
    color: Colors.textSoft,
    fontVariant: ["tabular-nums"],
  },
  errCell: { color: Colors.danger, fontWeight: FontWeight.bold },
  listContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  logRowError: { backgroundColor: Colors.dangerSoft },
  logRpc: { flex: 1, fontSize: FontSize.xs, color: Colors.text },
  logDur: {
    fontSize: FontSize.xs,
    color: Colors.textSoft,
    fontVariant: ["tabular-nums"],
    minWidth: 60,
    textAlign: "right",
  },
  logStatus: { fontSize: FontSize.sm, width: 14, textAlign: "center" },
  logTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontVariant: ["tabular-nums"],
    minWidth: 70,
    textAlign: "right",
  },
  empty: {
    textAlign: "center",
    marginTop: Spacing.xl,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  btnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  btnTextPrimary: { color: Colors.white },
  hotspot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    zIndex: 9999,
  },
});

export default RpcDebugScreen;
