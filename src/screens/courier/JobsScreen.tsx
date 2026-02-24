import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  assignCourierToOrder,
  getAvailableOrdersForCourier,
} from "../../services/orderService";
import { Order } from "../../types";

const JobsScreen: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const data = await getAvailableOrdersForCourier();
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, []),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;

    Alert.alert(
      "Захиалга хүлээн авах",
      "Энэ захиалгыг хүлээн авахдаа итгэлтэй байна уу?",
      [
        { text: "Үгүй", style: "cancel" },
        {
          text: "Тийм",
          onPress: async () => {
            setAcceptingOrderId(orderId);
            try {
              await assignCourierToOrder(orderId, user.id, user.email);
              Alert.alert("Амжилттай", "Захиалга хүлээн авлаа!");
              loadOrders();
            } catch (error: any) {
              Alert.alert("Алдаа", error.message || "Алдаа гарлаа");
            } finally {
              setAcceptingOrderId(null);
            }
          },
        },
      ],
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{item.id}</Text>
        <View style={styles.readyBadge}>
          <Text style={styles.readyText}>📢 Нийтлэгдсэн</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.shopName}>🏪 {item.supplierName}</Text>
        <Text style={styles.deliveryAddress}>📍 {item.deliveryAddress}</Text>
        <Text style={styles.orderDate}>
          🕐 {new Date(item.createdAt).toLocaleTimeString("mn-MN")}
        </Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalPrice}>
          ₮{item.totalPrice.toLocaleString()}
        </Text>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            acceptingOrderId === item.id && styles.acceptButtonDisabled,
          ]}
          onPress={() => handleAcceptOrder(item.id)}
          disabled={acceptingOrderId === item.id}
        >
          {acceptingOrderId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>Хүлээн авах</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>📋 Боломжит захиалгууд</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} захиалга боломжтой
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
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Захиалга байхгүй</Text>
            <Text style={styles.emptySubtitle}>
              Бэлэн болсон захиалга байхгүй байна
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
  readyBadge: {
    backgroundColor: "#d4edda",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#28a745",
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
  orderDate: {
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
  acceptButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
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
  },
});

export default JobsScreen;
