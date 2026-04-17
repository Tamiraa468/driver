import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CheckCircle, Info, Navigation, Package } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DeliveryRouteMap from "../../components/DeliveryRouteMap";
import {
  Card,
  HeroPanel,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  StateView,
  StatusBadge,
} from "../../components/ui";
import { supabase } from "../../config/supabaseClient";
import { claimDeliveryTask, updateTaskStatus } from "../../services/deliveryTaskService";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/design";
import { CourierRootStackParamList } from "../../navigation/CourierRootNavigator";

interface Destination {
  id: string;
  name: string;
  initial: string;
  color: string;
  address: string;
  district: string;
  price: number;
  deliveryWindow: string;
  deliveryTone: "warning" | "info";
  note: string;
}

interface TaskDetail {
  taskId: string;
  merchantName: string;
  merchantInitial: string;
  merchantColor: string;
  pickupAddress: string;
  distanceKm: number;
  phone: string | null;
  destinations: Destination[];
  task: {
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    dropoff_address: string;
  };
  walletRequired: boolean;
  status: string;
}

interface TaskDetailRow {
  id: string;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  pickup_latitude?: number | string | null;
  pickup_longitude?: number | string | null;
  dropoff_latitude?: number | string | null;
  dropoff_longitude?: number | string | null;
  pickup_note?: string | null;
  dropoff_note?: string | null;
  note?: string | null;
  instructions?: string | null;
  package_value?: number | null;
  delivery_fee: number | string;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  status: string;
  created_at: string;
  distance_km?: number | string | null;
  dropoff_lat?: number | string | null;
  dropoff_lng?: number | string | null;
}

const ACCENT_COLORS = ["#151515", "#353535", "#5C5C5C", "#8B8B8B"];

function pickColor(seed: string): string {
  let total = 0;
  for (let index = 0; index < seed.length; index += 1) {
    total += seed.charCodeAt(index);
  }

  return ACCENT_COLORS[total % ACCENT_COLORS.length];
}

function extractDistrict(address: string): string {
  const match = address.match(/[\w\u0400-\u04FF]+\s*дүүрэг/);
  return match ? match[0] : (address.split(",")[0]?.trim() ?? address);
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapToTaskDetail(task: TaskDetailRow): TaskDetail {
  const merchantColor = pickColor(task.id);
  const destinationColor = pickColor(`${task.id}-destination`);
  const ageHours =
    (Date.now() - new Date(task.created_at).getTime()) / 3_600_000;
  const urgent = ageHours > 1;
  const pickupAddress = task.pickup_address ?? task.pickup_note ?? "Тодорхойгүй";
  const dropoffAddress =
    task.dropoff_address ?? task.dropoff_note ?? "Тодорхойгүй";
  const displayName = task.receiver_name ?? "Харилцагч";

  return {
    taskId: task.id,
    merchantName: displayName,
    merchantInitial: displayName.trim()[0]?.toUpperCase() ?? "Т",
    merchantColor,
    pickupAddress,
    distanceKm: toNumber(task.distance_km) ?? 0,
    phone: task.receiver_phone ?? null,
    destinations: [
      {
        id: `${task.id}-destination`,
        name: displayName,
        initial: dropoffAddress.trim()[0]?.toUpperCase() ?? "А",
        color: destinationColor,
        address: dropoffAddress,
        district: extractDistrict(dropoffAddress),
        price: toNumber(task.delivery_fee) ?? 0,
        deliveryWindow: urgent ? "3 цагийн дотор" : "Өдөртөө",
        deliveryTone: urgent ? "warning" : "info",
        note: task.note ?? task.instructions ?? "Нэмэлт мэдээлэл байхгүй",
      },
    ],
    task: {
      dropoff_lat: toNumber(task.dropoff_latitude ?? task.dropoff_lat),
      dropoff_lng: toNumber(task.dropoff_longitude ?? task.dropoff_lng),
      dropoff_address: dropoffAddress,
    },
    walletRequired: true,
    status: task.status,
  };
}

type NavProp = NativeStackNavigationProp<
  CourierRootStackParamList,
  "DeliveryDetails"
>;
type RouteType = RouteProp<CourierRootStackParamList, "DeliveryDetails">;

const DeliveryDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { taskId } = route.params ?? {};

  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setError("Даалгаврын дугаар олдсонгүй");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("delivery_tasks")
          .select(`
            id, status, delivery_fee,
            pickup_note, dropoff_note, note, package_value,
            receiver_name, receiver_phone, created_at,
            pickup_location:locations!pickup_location_id(address_text, note, label),
            dropoff_location:locations!dropoff_location_id(address_text, note, label)
          `)
          .eq("id", taskId)
          .single();

        if (cancelled) {
          return;
        }

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          throw new Error("not_found");
        }

        const r = data as any;
        const pickupLoc = Array.isArray(r.pickup_location)
          ? r.pickup_location[0]
          : r.pickup_location;
        const dropoffLoc = Array.isArray(r.dropoff_location)
          ? r.dropoff_location[0]
          : r.dropoff_location;

        const row: TaskDetailRow = {
          id: r.id ?? taskId,
          pickup_address: pickupLoc?.address_text ?? undefined,
          dropoff_address: dropoffLoc?.address_text ?? undefined,
          pickup_note: r.pickup_note ?? undefined,
          dropoff_note: r.dropoff_note ?? undefined,
          note: r.note ?? undefined,
          package_value: r.package_value ?? undefined,
          delivery_fee: r.delivery_fee ?? 0,
          receiver_name: r.receiver_name ?? undefined,
          receiver_phone: r.receiver_phone ?? undefined,
          status: r.status ?? "published",
          created_at: r.created_at ?? new Date().toISOString(),
        };
        setDetail(mapToTaskDetail(row));
      } catch (fetchError) {
        console.error("[DeliveryDetailsScreen] fetch error:", fetchError);
        if (!cancelled) {
          setError("Мэдээлэл татаж чадсангүй");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleCall = () => {
    if (!detail?.phone) {
      return;
    }

    void Linking.openURL(`tel:${detail.phone}`);
  };

  const handlePickupMap = () => {
    if (!detail?.pickupAddress) {
      return;
    }

    void Linking.openURL(
      "https://www.google.com/maps/search/?api=1" +
        `&query=${encodeURIComponent(detail.pickupAddress)}`,
    );
  };

  const handleConfirmPickup = async () => {
    if (!detail) return;
    setMarking(true);
    try {
      await updateTaskStatus(detail.taskId, "picked_up");
      setDetail((prev) => prev ? { ...prev, status: "picked_up" } : prev);
      navigation.navigate("ActiveTracking", { taskId: detail.taskId });
    } catch {
      Alert.alert("Алдаа", "Төлвийг шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setMarking(false);
    }
  };

  const handleStartDelivery = () => {
    if (!detail) return;
    navigation.navigate("ActiveTracking", { taskId: detail.taskId });
  };

  const handleClaimTask = async () => {
    if (!detail) return;
    setClaiming(true);
    try {
      await claimDeliveryTask(detail.taskId);
      setDetail((prev) => prev ? { ...prev, status: "assigned" } : prev);
      Alert.alert("Амжилттай", "Даалгавар амжилттай хүлээн авлаа.");
    } catch {
      Alert.alert("Алдаа", "Даалгавар хүлээн авахад алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setClaiming(false);
    }
  };

  const districtCounts = useMemo(
    () =>
      (detail?.destinations ?? []).reduce<Record<string, number>>(
        (accumulator, destination) => ({
          ...accumulator,
          [destination.district]: (accumulator[destination.district] ?? 0) + 1,
        }),
        {},
      ),
    [detail?.destinations],
  );
  const totalPayout = useMemo(
    () =>
      (detail?.destinations ?? []).reduce(
        (total, destination) => total + destination.price,
        0,
      ),
    [detail?.destinations],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Хүргэлтийн дэлгэрэнгүй"
            subtitle="Курьерын даалгаврын тойм болон хүргэлтийн маршрут"
            onBackPress={() => navigation.goBack()}
          />
          <StateView
            loading
            title="Хүргэлтийн дэлгэрэнгүйг ачааллаж байна..."
            description="Энэ даалгаврын авах болон хүргэх мэдээллийг цуглуулж байна."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Хүргэлтийн дэлгэрэнгүй"
            subtitle="Курьерын даалгаврын тойм болон хүргэлтийн маршрут"
            onBackPress={() => navigation.goBack()}
          />
          <StateView
            icon={<Info size={24} color={Colors.danger} strokeWidth={2} />}
            title="Энэ даалгаврыг ачаалж чадсангүй"
            description={error ?? "Мэдээлэл олдсонгүй"}
            actionLabel="Буцах"
            onActionPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Хүргэлтийн дэлгэрэнгүй"
        subtitle={`Даалгавар #${detail.taskId.slice(0, 8).toUpperCase()}`}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeroPanel
          accessory={
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: `${detail.merchantColor}18`,
                  borderColor: `${detail.merchantColor}30`,
                },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: detail.merchantColor }]}
              >
                {detail.merchantInitial}
              </Text>
            </View>
          }
          badgeLabel={detail.phone ? "Дуудлага хийх боломжтой" : "Утасны мэдээлэлгүй"}
          badgeTone={detail.phone ? "info" : "default"}
          description={detail.pickupAddress}
          eyebrow="Авах цэг"
          footer={
            <View style={styles.actionRow}>
              <PrimaryButton
                title="Залгах"
                onPress={handleCall}
                disabled={!detail.phone}
                variant="outline"
                style={styles.actionButton}
              />
              <PrimaryButton
                title="Авах цэгийг газрын зураг дээр нээх"
                onPress={handlePickupMap}
                variant="secondary"
                style={styles.actionButton}
              />
            </View>
          }
          metrics={[
            { label: "Зай", value: `${detail.distanceKm.toFixed(1)} км` },
            { label: "Цэг", value: detail.destinations.length.toString() },
            { label: "Орлого", value: `${totalPayout.toLocaleString()}₮` },
          ]}
          style={styles.heroPanel}
          title={detail.merchantName}
        />

        {detail.task.dropoff_lat !== null && detail.task.dropoff_lng !== null ? (
          <DeliveryRouteMap
            destination={{
              latitude: detail.task.dropoff_lat,
              longitude: detail.task.dropoff_lng,
            }}
            destinationTitle={detail.task.dropoff_address}
          />
        ) : (
          <Card style={styles.routeFallbackCard}>
            <Text style={styles.routeFallbackTitle}>Хүргэлтийн маршрут</Text>
            <Text style={styles.routeFallbackText}>
              Энэ даалгаврын хүргэх цэгийн координат одоогоор алга байна.
            </Text>
          </Card>
        )}

        <SectionTitle title={`Хүргэлтийн цэгүүд (${detail.destinations.length})`} />

        {Object.keys(districtCounts).length > 0 ? (
          <View style={styles.districtRow}>
            {Object.entries(districtCounts).map(([district, count]) => (
              <StatusBadge
                key={district}
                label={`${district} (${count})`}
                status="default"
              />
            ))}
          </View>
        ) : null}

        {detail.destinations.map((destination) => (
          <Card key={destination.id} style={styles.sectionCard}>
            <Text style={styles.eyebrow}>Хүргэх цэг</Text>
            <View style={styles.topRow}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: `${destination.color}18` },
                ]}
              >
                <Text
                  style={[styles.avatarText, { color: destination.color }]}
                >
                  {destination.initial}
                </Text>
              </View>

              <View style={styles.flex}>
                <View style={styles.destinationHeader}>
                  <Text style={styles.cardTitle}>{destination.name}</Text>
                  <Text style={styles.priceText}>
                    {destination.price.toLocaleString()}₮
                  </Text>
                </View>
                <Text style={styles.cardAddress}>{destination.address}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <StatusBadge label={destination.district} status="default" />
              <StatusBadge
                label={destination.deliveryWindow}
                status={destination.deliveryTone}
              />
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>Хүргэлтийн тэмдэглэл</Text>
              <Text style={styles.noteText}>{destination.note}</Text>
            </View>
          </Card>
        ))}

      </ScrollView>

      <View style={[styles.bottomBar, Shadow.float]}>
        {detail.status === "published" ? (
          <PrimaryButton
            title="Даалгавар хүлээн авах"
            onPress={() => { void handleClaimTask(); }}
            loading={claiming}
            icon={<Package size={18} color={Colors.white} strokeWidth={2} />}
          />
        ) : detail.status === "assigned" ? (
          <PrimaryButton
            title="Дэлгүүрт ирлээ — Авсан гэж тэмдэглэх"
            onPress={() => { void handleConfirmPickup(); }}
            loading={marking}
            icon={<CheckCircle size={18} color={Colors.white} strokeWidth={2} />}
          />
        ) : detail.status === "picked_up" ? (
          <PrimaryButton
            title="Хүргэлт эхлүүлэх"
            onPress={handleStartDelivery}
            variant="success"
            icon={<Navigation size={18} color={Colors.white} strokeWidth={2} />}
          />
        ) : null}
      </View>
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
    paddingBottom: 120,
  },
  heroPanel: {
    marginBottom: Spacing.md,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm + 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  flex: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  routeFallbackCard: {
    marginBottom: Spacing.md,
  },
  routeFallbackTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
  },
  routeFallbackText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  districtRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  destinationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  priceText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  noteCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noteText: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 2,
  },
  walletTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  walletDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    left: Layout.screenPadding,
    right: Layout.screenPadding,
    bottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
});

export default DeliveryDetailsScreen;
