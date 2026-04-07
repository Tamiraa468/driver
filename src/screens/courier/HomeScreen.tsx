import { useNavigation } from "@react-navigation/native";
import {
  CircleAlert,
  Package,
  Power,
  RefreshCcw,
  Truck,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
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
import { fetchAvailableTasks } from "../../services/deliveryTaskService";
import { AvailableTask } from "../../types/order";

interface JobPreview {
  id: string;
  title: string;
  price: string;
  pickup: string;
  dropoff: string;
  postedAt: string;
}

function buildJobPreview(task: AvailableTask): JobPreview {
  return {
    id: task.task_id,
    title:
      task.receiver_name ||
      `Хүргэлт #${task.task_id.slice(0, 8).toUpperCase()}`,
    price: `₮${task.delivery_fee.toLocaleString()}`,
    pickup: task.pickup_address || task.pickup_note || "Авах цэгийн мэдээлэлгүй",
    dropoff: task.dropoff_address || task.dropoff_note || "Хүргэх цэгийн мэдээлэлгүй",
    postedAt: new Date(task.created_at).toLocaleString("mn-MN", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isOnline, setIsOnline] = useState(false);
  const [tasks, setTasks] = useState<AvailableTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchAvailableTasks();
      setTasks(data);
    } catch (loadError) {
      console.error("[HomeScreen] Failed to load available tasks:", loadError);
      setError("Сүүлийн хүргэлтийн боломжуудыг шинэчилж чадсангүй.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
  }, [loadTasks]);

  const jobPreviews = useMemo(() => tasks.map(buildJobPreview), [tasks]);
  const queueTitle = isOnline
    ? "Шинэ хүргэлтүүд танд харагдаж байна"
    : "Ажил авахад бэлэн болмогц онлайн болоорой";
  const queueDescription =
    tasks.length > 0
      ? `Одоо ${tasks.length} нээлттэй хүргэлт хурдан шалгахад бэлэн байна.`
      : "Одоогоор нээлттэй хүргэлт алга. Доош татаж шинэчлээд шинэ боломжийг шалгана уу.";

  const header = (
    <View>
      <ScreenHeader
        title="Курьерын нүүр"
        subtitle="Онлайнаар байж, шинэ хүргэлтүүдийг хурдан шалгаад өдрөө цэгцтэй удирдаарай."
        right={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsOnline((value) => !value)}
            style={[
              styles.toggle,
              isOnline ? styles.toggleActive : styles.toggleInactive,
            ]}
          >
            <Power
              size={14}
              color={isOnline ? Colors.white : Colors.textSoft}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.toggleText,
                isOnline ? styles.toggleTextActive : null,
              ]}
            >
              {isOnline ? "Онлайн" : "Оффлайн"}
            </Text>
          </TouchableOpacity>
        }
      />

      <HeroPanel
        accessory={
          <View style={styles.heroAccessory}>
            <Truck size={22} color={Colors.primaryDark} strokeWidth={2.2} />
          </View>
        }
        badgeLabel={isOnline ? "Хүлээн авахад бэлэн" : "Оффлайн горим"}
        badgeTone={isOnline ? "success" : "default"}
        description={queueDescription}
        eyebrow={isOnline ? "Курьер бэлэн" : "Идэвхгүй байна"}
        metrics={[
          { label: "Нээлттэй хүргэлт", value: tasks.length.toLocaleString() },
          { label: "Горим", value: isOnline ? "Онлайн" : "Оффлайн" },
          { label: "Шинэчлэх", value: "Доош татах" },
        ]}
        style={styles.heroPanel}
        title={queueTitle}
      />

      <View style={styles.summaryGrid}>
        <SummaryCard
          hint="Хэзээ ч өөрчилж болно"
          icon={Power}
          label="Ажлын төлөв"
          style={styles.summaryCard}
          tone={isOnline ? "success" : "neutral"}
          value={isOnline ? "Онлайн" : "Оффлайн"}
        />
        <SummaryCard
          hint="Шалгахад бэлэн"
          icon={Truck}
          label="Одоо боломжтой"
          style={styles.summaryCard}
          tone="primary"
          value={tasks.length.toLocaleString()}
        />
      </View>

      {error ? (
        <Card style={styles.errorCard} variant="subtle">
          <View style={styles.errorRow}>
            <CircleAlert size={16} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </Card>
      ) : null}

      <SectionTitle title="Боломжит хүргэлтүүд" />
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Курьерын нүүр"
            subtitle="Онлайнаар байж, шинэ хүргэлтүүдийг хурдан шалгаад өдрөө цэгцтэй удирдаарай."
          />
          <StateView
            loading
            title="Боломжит хүргэлтүүдийг ачааллаж байна..."
            description="Таны нүүр дэлгэцийн хүргэлтийн дарааллыг шинэчилж байна."
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
            title="Курьерын нүүр"
            subtitle="Онлайнаар байж, шинэ хүргэлтүүдийг хурдан шалгаад өдрөө цэгцтэй удирдаарай."
          />
          <StateView
            icon={<RefreshCcw size={22} color={Colors.danger} strokeWidth={2} />}
            title="Нүүр дэлгэцийн мэдээллийг ачаалж чадсангүй"
            description="Боломжит хүргэлтүүдийг дахин шинэчилж үзнэ үү."
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
        data={jobPreviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItemCard
            amountText={item.price}
            amountTone="primary"
            badgeLabel="Нээлттэй"
            badgeTone="info"
            leading={<Package size={18} color={Colors.primary} strokeWidth={2} />}
            onPress={() =>
              navigation.navigate("DeliveryDetails", { taskId: item.id })
            }
            style={styles.taskCard}
            subtitle={`Нийтлэгдсэн: ${item.postedAt}`}
            title={item.title}
            rows={[
              { label: "Авах цэг", value: item.pickup },
              { label: "Хүргэх цэг", value: item.dropoff },
            ]}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <StateView
            icon={<Package size={24} color={Colors.primary} strokeWidth={2} />}
            title="Нээлттэй хүргэлт алга"
            description="Шинэ хүргэлт нийтлэгдмэгц энд харагдана."
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
  toggle: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primarySoftStrong,
  },
  toggleText: {
    marginLeft: Spacing.xs + 2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSoft,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  heroPanel: {
    marginBottom: Spacing.md,
  },
  heroAccessory: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    width: "48.2%",
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
  emptyState: {
    marginTop: Spacing.sm,
  },
});

export default HomeScreen;
