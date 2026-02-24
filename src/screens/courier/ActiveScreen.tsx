import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { Order, OrderStatus } from "../../types";
import {
  getOrdersByCourierId,
  verifyPickupOtp,
  verifyDropoffOtp,
} from "../../services/orderService";

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: "#FFA500",
    confirmed: "#007AFF",
    preparing: "#9B59B6",
    published: "#2ECC71",
    assigned: "#1ABC9C",
    picked_up: "#3498DB",
    delivered: "#27AE60",
    cancelled: "#E74C3C",
  };
  return colors[status] || "#666";
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
    value: string
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
      Alert.alert("OTP шаардлагатай", "Pickup OTP оруулна уу.");
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      await verifyPickupOtp(orderId, otp);
      Alert.alert("Амжилттай", "Pickup OTP баталгаажлаа.");
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
      Alert.alert("OTP шаардлагатай", "Dropoff OTP оруулна уу.");
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
          <Text style={styles.shopName}>🏪 {item.supplierName}</Text>
          <Text style={styles.deliveryAddress}>📍 {item.deliveryAddress}</Text>
          {item.customerEmail && (
            <Text style={styles.customerEmail}>👤 {item.customerEmail}</Text>
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
              placeholder="Pickup OTP"
              keyboardType="number-pad"
              value={otpInputs[item.id]?.pickup || ""}
              onChangeText={(value) =>
                updateOtpInput(item.id, "pickup", value)
              }
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
                <ActivityIndicator size="small" color="#fff" />
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
              placeholder="Dropoff OTP"
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
                <ActivityIndicator size="small" color="#fff" />
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Ачаалж байна...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚴 Идэвхтэй захиалгууд</Text>
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
            <Text style={styles.emptyEmoji}>🎉</Text>
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
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.1)",
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
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
    borderBottomColor: "#f0f0f0",
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  deliveryAddress: {
    fontSize: 14,
    color: "#666",
  },
  customerEmail: {
    fontSize: 14,
    color: "#666",
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  otpInput: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 14,
  },
  otpButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  updateButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 140,
    alignItems: "center",
  },
  deliveredButton: {
    backgroundColor: "#28a745",
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  otpButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default ActiveScreen;
