import { useFocusEffect } from "@react-navigation/native";
import { Bike, CheckCircle, MapPin, Store, User } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Colors,
  FontSize,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/design";
import { useAuth } from "../../context/AuthContext";
import {
  getOrdersByCourierId,
  verifyDropoffOtp,
  verifyPickupOtp,
} from "../../services/orderService";
import { Order, OrderStatus } from "../../types";

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: Colors.warning,
    confirmed: Colors.primaryPressed,
    preparing: Colors.textMuted,
    published: Colors.primaryDark,
    assigned: Colors.primary,
    picked_up: Colors.primaryPressed,
    delivered: Colors.success,
    cancelled: Colors.danger,
  };
  return colors[status] || Colors.textSoft;
};

const getStatusText = (status: OrderStatus): string => {
  const texts: Record<OrderStatus, string> = {
    pending: "Хүлээгдэж байна",
    confirmed: "Баталгаажсан",
    preparing: "Бэлтгэж байна",
    published: "Нийтлэгдсэн",
    assigned: "Курьер авсан",
    picked_up: "Авсан",
    delivered: "Хүргэгдсэн",
    cancelled: "Цуцлагдсан",
  };
  return texts[status] || status;
};

const ActiveScreen: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [otpInputs, setOtpInputs] = useState<
    Record<string, { pickup?: string; dropoff?: string }>
  >({});

  const loadOrders = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getOrdersByCourierId(user.id);
      // Filter active orders (not delivered or cancelled)
      const activeOrders = data.filter(
        (o) => o.status !== "delivered" && o.status !== "cancelled",
      );
      setOrders(activeOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  const updateOtpInput = (
    orderId: string,
    type: "pickup" | "dropoff",
    value: string,
  ) => {
    setOtpInputs((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [type]: value,
      },
    }));
  };

  const handleVerifyPickup = async (orderId: string) => {
    const otp = otpInputs[orderId]?.pickup?.trim();
    if (!otp) {
      Alert.alert("OTP шаардлагатай", "Авах OTP кодоо оруулна уу.");
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      await verifyPickupOtp(orderId, otp);
      Alert.alert("Амжилттай", "Авах OTP код баталгаажлаа.");
      loadOrders();
    } catch (error: any) {
      Alert.alert("Алдаа", error.message || "Алдаа гарлаа");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleVerifyDropoff = async (orderId: string) => {
    const otp = otpInputs[orderId]?.dropoff?.trim();
    if (!otp) {
      Alert.alert("OTP шаардлагатай", "Хүргэлтийн OTP кодоо оруулна уу.");
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      await verifyDropoffOtp(orderId, otp);
      Alert.alert("🎉 Амжилттай!", "Захиалга амжилттай хүргэгдлээ!");
      loadOrders();
    } catch (error: any) {
      Alert.alert("Алдаа", error.message || "Алдаа гарлаа");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{item.id}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Store size={16} color={Colors.text} strokeWidth={2} />
            <Text style={styles.shopName}>{item.supplierName}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MapPin size={16} color={Colors.textSoft} strokeWidth={2} />
            <Text style={styles.deliveryAddress}>{item.deliveryAddress}</Text>
          </View>
          {item.customerEmail && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <User size={16} color={Colors.textSoft} strokeWidth={2} />
              <Text style={styles.customerEmail}>{item.customerEmail}</Text>
            </View>
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.totalPrice}>
            ₮{item.totalPrice.toLocaleString()}
          </Text>
        </View>

        {item.status === "assigned" && (
          <View style={styles.otpRow}>
            <TextInput
              style={styles.otpInput}
              placeholder="Авах OTP код"
              keyboardType="number-pad"
              value={otpInputs[item.id]?.pickup || ""}
              onChangeText={(value) => updateOtpInput(item.id, "pickup", value)}
            />
            <TouchableOpacity
              style={[
                styles.otpButton,
                updatingOrderId === item.id && styles.updateButtonDisabled,
              ]}
              onPress={() => handleVerifyPickup(item.id)}
              disabled={updatingOrderId === item.id}
            >
              {updatingOrderId === item.id ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={styles.otpButtonText}>Баталгаажуулах</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {item.status === "picked_up" && (
          <View style={styles.otpRow}>
            <TextInput
              style={styles.otpInput}
              placeholder="Хүргэлтийн OTP код"
              keyboardType="number-pad"
              value={otpInputs[item.id]?.dropoff || ""}
              onChangeText={(value) =>
                updateOtpInput(item.id, "dropoff", value)
              }
            />
            <TouchableOpacity
              style={[
                styles.otpButton,
                styles.deliveredButton,
                updatingOrderId === item.id && styles.updateButtonDisabled,
              ]}
              onPress={() => handleVerifyDropoff(item.id)}
              disabled={updatingOrderId === item.id}
            >
              {updatingOrderId === item.id ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={styles.otpButtonText}>Хүргэгдсэн</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Ачаалж байна...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          <Bike size={20} color={Colors.text} strokeWidth={2} /> Идэвхтэй захиалгууд
        </Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} идэвхтэй захиалга
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle size={48} color={Colors.primaryDark} strokeWidth={2} />
            <Text style={styles.emptyTitle}>Идэвхтэй захиалга байхгүй</Text>
            <Text style={styles.emptySubtitle}>
              &quot;Боломжит&quot; хэсгээс захиалга хүлээн аваарай
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSoft,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    marginTop: 4,
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 20,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderId: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSoft,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shopName: {
    fontSize: FontSize.base,
    fontWeight: "600",
    color: Colors.text,
  },
  deliveryAddress: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
  },
  customerEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalPrice: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.primaryPressed,
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  otpInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  otpButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  updateButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 140,
    alignItems: "center",
  },
  deliveredButton: {
    backgroundColor: Colors.primarySoftStrong,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  otpButtonText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  updateButtonText: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    textAlign: "center",
  },
});

export default ActiveScreen;
