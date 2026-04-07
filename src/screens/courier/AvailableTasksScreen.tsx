import { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CircleAlert,
  ClipboardList,
  Package,
  RefreshCcw,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CourierRootStackParamList } from "../../navigation/CourierRootNavigator";
import {
  Card,
  ListItemCard,
  PrimaryButton,
  ScreenHeader,
  StateView,
} from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Spacing,
} from "../../constants/design";
import {
  fetchCourierAssignedTasks,
  subscribeToCourierTasks,
} from "../../services/deliveryTaskService";
import { DeliveryTask, DeliveryTaskStatus } from "../../types/order";

const STATUS_CONFIG: Record<
  string,
  { label: string; tone: "success" | "warning" | "info" | "default" }
> = {
  assigned: { label: "Хуваарилагдсан", tone: "info" },
  picked_up: { label: "Авсан", tone: "warning" },
  delivered: { label: "Хүргэгдсэн", tone: "success" },
};

function getStatusConfig(status: DeliveryTaskStatus) {
  return STATUS_CONFIG[status] ?? { label: status, tone: "default" as const };
}

function formatTime(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Саяхан";
  if (diffMins < 60) return `${diffMins} мин өмнө`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} цаг өмнө`;
  return `${Math.floor(diffHours / 24)} өдөр өмнө`;
}

function isActiveStatus(status: DeliveryTaskStatus): boolean {
  return status === "assigned" || status === "picked_up";
}

type NavProp = NativeStackNavigationProp<CourierRootStackParamList>;

export default function AvailableTasksScreen() {
  const navigation = useNavigation<NavProp>();
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCourierAssignedTasks();
      setTasks(data);
    } catch (loadError) {
      console.error("[MyAssignedTasks] Error loading tasks:", loadError);
      setError("Миний хүргэлтүүдийг ачаалж чадсангүй.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      subscription = subscribeToCourierTasks((updatedTasks) => {
        setError(null);
        setTasks(updatedTasks);
      });
    };

    void setupSubscription();

    return () => {
      if (subscription) {
        void subscription.unsubscribe();
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
  }, [loadTasks]);

  const activeTasks = tasks.filter((t) => isActiveStatus(t.status));

  const header = (
    <View>
      <ScreenHeader
        title="Миний хүргэлтүүд"
        subtitle="Танд хуваарилагдсан хүргэлтүүдийг эндээс хянаарай."
      />

      <Card style={styles.summaryCard} variant="subtle">
        <Text style={styles.summaryLabel}>Хуваарилагдсан хүргэлтүүд</Text>
        <Text style={styles.summaryValue}>
          {tasks.length.toLocaleString()} хүргэлт
        </Text>
        {activeTasks.length > 0 && (
          <View style={styles.activeBadgeRow}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>
              {activeTasks.length} идэвхтэй хүргэлт
            </Text>
          </View>
        )}
      </Card>

      {error ? (
        <Card style={styles.errorCard} variant="subtle">
          <View style={styles.errorRow}>
            <CircleAlert size={16} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </Card>
      ) : null}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Миний хүргэлтүүд"
            subtitle="Танд хуваарилагдсан хүргэлтүүдийг эндээс хянаарай."
          />
          <StateView
            loading
            title="Хүргэлтүүдийг ачааллаж байна..."
            description="Танд хуваарилагдсан хүргэлтүүдийг шалгаж байна."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Миний хүргэлтүүд"
            subtitle="Танд хуваарилагдсан хүргэлтүүдийг эндээс хянаарай."
          />
          <StateView
            icon={<RefreshCcw size={22} color={Colors.danger} strokeWidth={2} />}
            title="Хүргэлтүүдийг ачаалж чадсангүй"
            description="Дахин оролдож шинэчилнэ үү."
            actionLabel="Дахин оролдох"
            onActionPress={() => {
              setLoading(true);
              void loadTasks();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const { label: statusLabel, tone: statusTone } = getStatusConfig(item.status);
          const active = isActiveStatus(item.status);
          const orderId = item.order_id ?? item.id;
          const title =
            item.dropoff_contact_name ||
            `Захиалга #${orderId.slice(0, 8).toUpperCase()}`;

          const actionLabel =
            item.status === "assigned"
              ? "Дэлгэрэнгүй"
              : item.status === "picked_up"
                ? "Хүргэлт хянах"
                : "Дэлгэрэнгүй";

          const handlePress = () => {
            if (item.status === "picked_up") {
              navigation.navigate("ActiveTracking", { taskId: item.id });
            } else {
              navigation.navigate("DeliveryDetails", { taskId: item.id });
            }
          };

          return (
            <ListItemCard
              amountText={`₮${item.delivery_fee.toLocaleString()}`}
              amountTone="primary"
              badgeLabel={statusLabel}
              badgeTone={statusTone}
              leading={
                <View style={[styles.leadingIcon, active && styles.leadingIconActive]}>
                  <Package
                    size={18}
                    color={active ? Colors.white : Colors.primary}
                    strokeWidth={2}
                  />
                </View>
              }
              style={[styles.taskCard, active && styles.taskCardActive]}
              subtitle={`Хуваарилагдсан: ${formatTime(item.assigned_at)}`}
              title={title}
              rows={[
                { label: "Захиалга", value: `#${orderId.slice(0, 8).toUpperCase()}` },
                { label: "Авах цэг", value: item.pickup_address || "Хаягийн мэдээлэлгүй" },
                { label: "Хүргэх цэг", value: item.dropoff_address || "Хаягийн мэдээлэлгүй" },
                ...(item.dropoff_contact_phone
                  ? [{ label: "Утас", value: item.dropoff_contact_phone }]
                  : []),
              ]}
              footer={
                <PrimaryButton
                  title={actionLabel}
                  onPress={handlePress}
                />
              }
            />
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <StateView
            icon={<ClipboardList size={24} color={Colors.primary} strokeWidth={2} />}
            title="Хуваарилагдсан хүргэлт алга"
            description="Танд одоогоор хуваарилагдсан хүргэлт байхгүй байна."
            style={styles.emptyState}
          />
        }
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
  },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  summaryCard: {
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSoft,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
  },
  activeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success ?? "#22c55e",
    marginRight: 6,
  },
  activeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.success ?? "#22c55e",
  },
  errorCard: {
    marginBottom: Spacing.md,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.danger,
    lineHeight: 20,
  },
  taskCard: {
    marginBottom: Spacing.sm + 4,
  },
  taskCardActive: {
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
  },
  leadingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  leadingIconActive: {
    backgroundColor: Colors.primary,
  },
  footer: {
    gap: Spacing.sm + 2,
  },
  emptyState: {
    marginTop: Spacing.sm,
  },
});
