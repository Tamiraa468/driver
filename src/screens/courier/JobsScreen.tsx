import { useFocusEffect } from "@react-navigation/native";
import {
  ClipboardList,
  Clock,
  Inbox,
  MapPin,
  Megaphone,
  Store,
} from "lucide-react-native";
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
import {
  Colors,
  FontSize,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/design";
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Megaphone size={14} color={Colors.primaryDark} strokeWidth={2} />
            <Text style={styles.readyText}>Нийтлэгдсэн</Text>
          </View>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Clock size={14} color={Colors.textSoft} strokeWidth={2} />
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleTimeString("mn-MN")}
          </Text>
        </View>
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
            <ActivityIndicator size="small" color={Colors.accent} />
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
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Ачаалж байна...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          <ClipboardList size={20} color={Colors.text} strokeWidth={2} /> Боломжит
          захиалгууд
        </Text>
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
            <Inbox size={48} color={Colors.mutedLight} strokeWidth={2} />
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
  readyBadge: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readyText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primaryPressed,
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
  orderDate: {
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
  acceptButton: {
    backgroundColor: Colors.primary,
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
  },
});

export default JobsScreen;
