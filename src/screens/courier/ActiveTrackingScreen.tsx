import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Info, Phone } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DeliveryRouteMap from "../../components/DeliveryRouteMap";
import { PrimaryButton, ScreenHeader, StateView } from "../../components/ui";
import { supabase } from "../../config/supabaseClient";
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
import { markDeliveredAndRequestOtp } from "../../services/deliveryTaskService";

interface ActiveTask {
  id: string;
  receiverName: string;
  receiverInitial: string;
  receiverPhone: string | null;
  dropoffAddress: string;
  deliveryFee: number;
  dropoffLat: number | null;
  dropoffLng: number | null;
  status: string;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type NavProp = NativeStackNavigationProp<CourierRootStackParamList, "ActiveTracking">;
type RouteType = RouteProp<CourierRootStackParamList, "ActiveTracking">;

const ActiveTrackingScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { taskId } = route.params;

  const [task, setTask] = useState<ActiveTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("delivery_tasks")
          .select("*")
          .eq("id", taskId)
          .maybeSingle();

        if (cancelled) return;
        if (fetchError) throw fetchError;
        if (!data) throw new Error("not_found");

        const raw = data as any;
        const displayName = raw.receiver_name ?? "Харилцагч";

        setTask({
          id: raw.id,
          receiverName: displayName,
          receiverInitial: displayName.trim()[0]?.toUpperCase() ?? "Х",
          receiverPhone: raw.receiver_phone ?? null,
          dropoffAddress: raw.dropoff_address ?? raw.dropoff_note ?? "Хүргэх хаяг тодорхойгүй",
          deliveryFee: toNumber(raw.delivery_fee) ?? 0,
          dropoffLat: toNumber(raw.dropoff_latitude ?? raw.dropoff_lat),
          dropoffLng: toNumber(raw.dropoff_longitude ?? raw.dropoff_lng),
          status: raw.status,
        });
      } catch {
        if (!cancelled) setError("Даалгаврын мэдээлэл татаж чадсангүй");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [taskId]);

  const handleCall = () => {
    if (!task?.receiverPhone) return;
    void Linking.openURL(`tel:${task.receiverPhone}`);
  };

  const handleMarkDelivered = async () => {
    if (!task) return;
    setMarking(true);
    try {
      await markDeliveredAndRequestOtp(task.id);
      // Navigate to ePOD screen; OTP was sent to the customer's email
      navigation.navigate("EPODVerification", { taskId: task.id });
    } catch (err: any) {
      Alert.alert(
        "Алдаа",
        err?.message || "Хүргэлт бүртгэхэд алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Хүргэлт явагдаж байна"
            onBackPress={() => navigation.goBack()}
          />
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !task) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.stateWrap}>
          <ScreenHeader
            title="Хүргэлт явагдаж байна"
            onBackPress={() => navigation.goBack()}
          />
          <StateView
            icon={<Info size={24} color={Colors.danger} strokeWidth={2} />}
            title="Даалгаврын мэдээлэл ачаалж чадсангүй"
            description={error ?? "Мэдээлэл олдсонгүй"}
            actionLabel="Буцах"
            onActionPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const hasCoords =
    task.dropoffLat !== null && task.dropoffLng !== null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Хүргэлт явагдаж байна"
        subtitle={`Даалгавар #${(task.id ?? "UNKNOWN").slice(0, 8).toUpperCase()}`}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {hasCoords ? (
          <DeliveryRouteMap
            destination={{ latitude: task.dropoffLat!, longitude: task.dropoffLng! }}
            destinationTitle={task.dropoffAddress}
          />
        ) : (
          <View style={styles.noMapCard}>
            <Text style={styles.noMapText}>
              Энэ даалгаврын хүргэх цэгийн координат байхгүй байна.
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomCard, Shadow.float]}>
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>{task.receiverInitial}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{task.receiverName}</Text>
            <Text style={styles.customerAddress} numberOfLines={2}>
              {task.dropoffAddress}
            </Text>
          </View>
          <Text style={styles.feeText}>₮{task.deliveryFee.toLocaleString()}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.callButton,
              !task.receiverPhone && styles.callButtonDisabled,
            ]}
            activeOpacity={0.7}
            onPress={handleCall}
            disabled={!task.receiverPhone}
          >
            <Phone size={18} color={task.receiverPhone ? Colors.primary : Colors.muted} strokeWidth={2} />
            <Text style={[styles.callText, !task.receiverPhone && styles.callTextDisabled]}>
              Харилцагч руу залгах
            </Text>
          </TouchableOpacity>
        </View>

        <PrimaryButton
          title="Хүргэгдсэн гэж тэмдэглэх"
          onPress={() => { void handleMarkDelivered(); }}
          loading={marking}
          variant="success"
        />
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
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
  },
  noMapCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noMapText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  bottomCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl + 4,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 4,
  },
  customerAvatarText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  customerInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  customerName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.dark,
  },
  customerAddress: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginTop: 2,
  },
  feeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  actionRow: {
    marginBottom: Spacing.md,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs + 2,
  },
  callButtonDisabled: {
    opacity: 0.5,
  },
  callText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.dark,
  },
  callTextDisabled: {
    color: Colors.muted,
  },
});

export default ActiveTrackingScreen;
