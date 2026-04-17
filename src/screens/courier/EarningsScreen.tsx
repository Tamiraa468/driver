import { useFocusEffect } from "@react-navigation/native";
import {
  CalendarDays,
  CircleAlert,
  Clock3,
  Package,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  FilterTabs,
  HeroPanel,
  ListItemCard,
  ScreenHeader,
  SectionTitle,
  StateView,
  SummaryCard,
} from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Spacing,
} from "../../constants/design";
import { fetchCourierDashboardTasks } from "../../services/deliveryTaskService";
import {
  CourierDashboardTask,
  CourierTaskEarningStatus,
} from "../../types/order";

type EarningsFilter = "today" | "week" | "month" | "all";
type EarningsBucket = "earned" | "pending" | "not_earned" | "cancelled";
type BadgeTone = "success" | "warning" | "danger" | "info" | "default";
type AmountTone = "default" | "primary" | "success" | "warning" | "danger";

type LucideIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface SummaryCardItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "neutral";
}

interface DashboardSummary {
  totalEarnings: number;
  completedDeliveries: number;
  pendingPayout: number;
  thisWeekEarnings: number;
  currentPeriodEarnings: number;
  currentPeriodCompleted: number;
  currentPeriodPending: number;
}

interface HistoryItemViewModel {
  id: string;
  title: string;
  subtitle: string;
  pickupSummary: string;
  dropoffSummary: string;
  statusLabel: string;
  statusTone: BadgeTone;
  amountText: string;
  amountTone: AmountTone;
  sortTime: number;
}

const FILTER_OPTIONS = [
  { key: "today", label: "Өнөөдөр" },
  { key: "week", label: "Энэ 7 хоног" },
  { key: "month", label: "Энэ сар" },
  { key: "all", label: "Бүх хугацаа" },
] satisfies { key: EarningsFilter; label: string }[];

const PERIOD_LABELS: Record<EarningsFilter, string> = {
  today: "Өнөөдөр",
  week: "Энэ 7 хоног",
  month: "Энэ сар",
  all: "Бүх хугацаа",
};

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const weekday = next.getDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  next.setDate(next.getDate() - offset);
  return next;
}

function startOfMonth(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCurrency(amount: number): string {
  return `₮${Math.round(amount).toLocaleString()}`;
}

function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return "Огнооны мэдээлэлгүй";
  }

  return date.toLocaleString("mn-MN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTaskBucket(status: CourierTaskEarningStatus): EarningsBucket {
  switch (status) {
    case "delivered":
    case "completed":
      return "earned";
    case "picked_up":
    case "in_transit":
    case "on_way":
      return "pending";
    case "cancelled":
      return "cancelled";
    case "assigned":
    case "claimed":
    default:
      return "not_earned";
  }
}

function getStatusMeta(
  status: CourierTaskEarningStatus,
): { label: string; tone: BadgeTone } {
  switch (status) {
    case "delivered":
    case "completed":
      return { label: "Хүргэгдсэн", tone: "success" };
    case "picked_up":
      return { label: "Авсан", tone: "info" };
    case "in_transit":
    case "on_way":
      return { label: "Замдаа", tone: "info" };
    case "cancelled":
      return { label: "Цуцлагдсан", tone: "danger" };
    case "assigned":
    case "claimed":
      return { label: "Оноогдсон", tone: "warning" };
    default:
      return { label: "Хүлээгдэж байна", tone: "default" };
  }
}

function getReferenceDate(task: CourierDashboardTask): Date | null {
  return (
    parseDate(task.delivered_at) ??
    parseDate(task.picked_up_at) ??
    parseDate(task.accepted_at) ??
    parseDate(task.assigned_at) ??
    parseDate(task.updated_at) ??
    parseDate(task.created_at)
  );
}

function getReferenceTimestamp(task: CourierDashboardTask): number {
  return getReferenceDate(task)?.getTime() ?? 0;
}

function isWithinFilter(
  date: Date | null,
  filter: EarningsFilter,
  now: Date,
): boolean {
  if (!date) {
    return false;
  }

  if (filter === "all") {
    return true;
  }

  const target = date.getTime();

  if (filter === "today") {
    return target >= startOfDay(now).getTime();
  }

  if (filter === "week") {
    return target >= startOfWeek(now).getTime();
  }

  return target >= startOfMonth(now).getTime();
}

function shortenAddress(address: string): string {
  const summary = address.split(",")[0]?.trim();
  return summary && summary.length > 0 ? summary : address;
}

function buildDashboardSummary(
  tasks: CourierDashboardTask[],
  filter: EarningsFilter,
  now: Date,
): DashboardSummary {
  let totalEarnings = 0;
  let completedDeliveries = 0;
  let pendingPayout = 0;
  let thisWeekEarnings = 0;
  let currentPeriodEarnings = 0;
  let currentPeriodCompleted = 0;
  let currentPeriodPending = 0;

  for (const task of tasks) {
    const bucket = getTaskBucket(task.status);
    const amount = task.delivery_fee;
    const referenceDate = getReferenceDate(task);
    const completedDate = parseDate(task.delivered_at) ?? referenceDate;

    if (bucket === "earned") {
      totalEarnings += amount;
      completedDeliveries += 1;

      if (isWithinFilter(completedDate, "week", now)) {
        thisWeekEarnings += amount;
      }

      if (isWithinFilter(completedDate, filter, now)) {
        currentPeriodEarnings += amount;
        currentPeriodCompleted += 1;
      }
    }

    if (bucket === "pending") {
      pendingPayout += amount;

      if (isWithinFilter(referenceDate, filter, now)) {
        currentPeriodPending += amount;
      }
    }
  }

  return {
    totalEarnings,
    completedDeliveries,
    pendingPayout,
    thisWeekEarnings,
    currentPeriodEarnings,
    currentPeriodCompleted,
    currentPeriodPending,
  };
}

function buildHistoryItem(task: CourierDashboardTask): HistoryItemViewModel {
  const bucket = getTaskBucket(task.status);
  const { label, tone } = getStatusMeta(task.status);
  const referenceDate = getReferenceDate(task);

  let amountText = "Орлого тооцоогүй";
  let amountTone: AmountTone = "default";
  let subtitle = `Хүлээн авсан • ${formatDateTime(task.accepted_at ?? task.assigned_at)}`;

  if (bucket === "earned") {
    amountText = `+${formatCurrency(task.delivery_fee)}`;
    amountTone = "success";
    subtitle = `Хүргэгдсэн • ${formatDateTime(task.delivered_at)}`;
  } else if (bucket === "pending") {
    amountText = `${formatCurrency(task.delivery_fee)} хүлээгдэж байна`;
    amountTone = "warning";
    subtitle = `Сүүлийн шинэчлэлт • ${formatDateTime(
      task.picked_up_at ?? task.accepted_at ?? task.assigned_at,
    )}`;
  } else if (bucket === "cancelled") {
    amountText = formatCurrency(0);
    amountTone = "default";
    subtitle = `Цуцлагдсан • ${formatDateTime(task.updated_at ?? task.created_at)}`;
  }

  return {
    id: task.id,
    title: `Хүргэлт #${(task.id ?? "UNKNOWN").slice(0, 8).toUpperCase()}`,
    subtitle,
    pickupSummary: shortenAddress(task.pickup_address),
    dropoffSummary: shortenAddress(task.dropoff_address),
    statusLabel: label,
    statusTone: tone,
    amountText,
    amountTone,
    sortTime: referenceDate?.getTime() ?? 0,
  };
}

function filterHistoryTasks(
  tasks: CourierDashboardTask[],
  filter: EarningsFilter,
  now: Date,
): HistoryItemViewModel[] {
  return tasks
    .filter((task) => isWithinFilter(getReferenceDate(task), filter, now))
    .sort((a, b) => getReferenceTimestamp(b) - getReferenceTimestamp(a))
    .map(buildHistoryItem);
}

const EarningsScreen: React.FC = () => {
  const hasLoadedRef = useRef(false);
  const [tasks, setTasks] = useState<CourierDashboardTask[]>([]);
  const [filter, setFilter] = useState<EarningsFilter>("week");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async ({ showLoader = false, showRefresh = false } = {}) => {
      if (showLoader) {
        setLoading(true);
      }

      if (showRefresh) {
        setRefreshing(true);
      }

      try {
        setError(null);
        const data = await fetchCourierDashboardTasks();
        setTasks(data);
        hasLoadedRef.current = true;
    } catch (err) {
      console.error("[EarningsScreen] Failed to load dashboard:", err);
      setError("Орлогын самбарыг ачаалж чадсангүй.");
      } finally {
        if (showLoader) {
          setLoading(false);
        }

        if (showRefresh) {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard({ showLoader: !hasLoadedRef.current });
    }, [loadDashboard]),
  );

  const handleRefresh = useCallback(async () => {
    await loadDashboard({ showRefresh: true });
  }, [loadDashboard]);

  const summary = useMemo(
    () => buildDashboardSummary(tasks, filter, new Date()),
    [filter, tasks],
  );

  const historyItems = useMemo(
    () => filterHistoryTasks(tasks, filter, new Date()),
    [filter, tasks],
  );

  const summaryCards = useMemo<SummaryCardItem[]>(
    () => [
      {
        id: "total",
        label: "Нийт орлого",
        value: formatCurrency(summary.totalEarnings),
        hint: "Хүргэгдсэн бүх ажлын орлого",
        icon: Wallet,
        tone: "success",
      },
      {
        id: "completed",
        label: "Дууссан хүргэлт",
        value: summary.completedDeliveries.toLocaleString(),
        hint: "Хүргэгдсэн захиалгын тоо",
        icon: Package,
        tone: "primary",
      },
      {
        id: "pending",
        label: "Хүлээгдэж буй орлого",
        value: formatCurrency(summary.pendingPayout),
        hint: "Авсан болон замдаа яваа",
        icon: Clock3,
        tone: "warning",
      },
      {
        id: "week",
        label: "Энэ 7 хоногийн орлого",
        value: formatCurrency(summary.thisWeekEarnings),
        hint: "Энэ 7 хоногт дууссан",
        icon: CalendarDays,
        tone: "neutral",
      },
    ],
    [
      summary.completedDeliveries,
      summary.pendingPayout,
      summary.thisWeekEarnings,
      summary.totalEarnings,
    ],
  );

  const header = (
    <View>
      <ScreenHeader
        title="Орлого"
        subtitle="Дууссан хүргэлтүүд болон орлогоо хянаарай"
      />

      {error ? (
        <Card style={styles.banner} variant="subtle">
          <View style={styles.bannerRow}>
            <CircleAlert size={16} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        </Card>
      ) : null}

      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <SummaryCard key={card.id} {...card} style={styles.summaryCard} />
        ))}
      </View>

      <View style={styles.filterWrap}>
        <FilterTabs
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(value) => setFilter(value as EarningsFilter)}
        />
      </View>

      <HeroPanel
        badgeLabel={`${summary.currentPeriodCompleted.toLocaleString()} хүргэлт`}
        badgeTone="success"
        description="Энэ хугацааны тойм нь олсон орлого, хүлээгдэж буй дүн, хүргэлтийн идэвхийг нэг дороос хурдан харахад тусална."
        eyebrow="Сонгосон хугацаа"
        icon={<Wallet size={24} color={Colors.primaryDark} strokeWidth={2.1} />}
        metrics={[
          {
            label: "Хүлээгдэж буй",
            value: formatCurrency(summary.currentPeriodPending),
          },
          {
            label: "Түүхийн мөр",
            value: historyItems.length.toLocaleString(),
          },
          {
            label: "Шүүлтүүр",
            value: PERIOD_LABELS[filter],
          },
        ]}
        style={styles.heroPanel}
        title={formatCurrency(summary.currentPeriodEarnings)}
      />

      <SectionTitle title="Сүүлийн хүргэлтийн орлого" />
    </View>
  );

  if (loading && !hasLoadedRef.current) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Орлого"
            subtitle="Дууссан хүргэлтүүд болон орлогоо хянаарай"
          />
          <StateView
            loading
            title="Орлогын самбарыг ачааллаж байна..."
            description="Таны хүргэлтийн үзүүлэлт болон орлогын түүхийг авч байна."
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
            title="Орлого"
            subtitle="Дууссан хүргэлтүүд болон орлогоо хянаарай"
          />
          <StateView
            icon={<CircleAlert size={24} color={Colors.danger} strokeWidth={2} />}
            title="Орлогын мэдээллийг ачаалж чадсангүй"
            description="Курьерын самбарыг шинэчлэхийн тулд дахин оролдоно уу."
            actionLabel="Дахин оролдох"
            onActionPress={() => {
              void loadDashboard({ showLoader: true });
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={historyItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItemCard
            amountText={item.amountText}
            amountTone={item.amountTone}
            badgeLabel={item.statusLabel}
            badgeTone={item.statusTone}
            style={styles.historyCard}
            subtitle={item.subtitle}
            title={item.title}
            rows={[
              { label: "Авах цэг", value: item.pickupSummary },
              { label: "Хүргэх цэг", value: item.dropoffSummary },
            ]}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <StateView
            icon={<Wallet size={22} color={Colors.primary} strokeWidth={2} />}
            title="Одоогоор хүргэлтийн орлого алга"
            description={
              filter === "all"
                ? "Эхний хүргэлтээ дуусмагц орлогын мэдээлэл энд харагдана."
                : `${PERIOD_LABELS[filter]} хугацаанд хараахан хүргэлтийн мэдээлэл алга байна.`
            }
            style={styles.emptyState}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

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
  banner: {
    marginBottom: Spacing.md,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.danger,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  summaryCard: {
    width: "48.3%",
    marginBottom: Spacing.sm + 4,
  },
  filterWrap: {
    marginBottom: Spacing.md,
  },
  heroPanel: {
    marginBottom: Spacing.lg,
  },
  historyCard: {
    marginBottom: Spacing.sm + 4,
  },
  emptyState: {
    marginTop: Spacing.sm,
  },
});

export default EarningsScreen;
