import { Map, MapPin } from "lucide-react-native";
import React, { useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OrderCard from "../../components/OrderCard";
import {
  Colors,
  FontSize,
  Radius,
  Spacing,
} from "../../constants/design";
import { CourierOrder } from "../../types/order";

type OrderTab = "available" | "active" | "completed";

const MOCK_AVAILABLE_ORDERS: CourierOrder[] = [
  {
    id: "ORD-2024-001",
    restaurantName: "Pizza Palace",
    pickupLocation: "123 Main St, Downtown",
    dropoffLocation: "456 Park Ave, Midtown",
    distance: 3.2,
    deliveryFee: 25000,
    totalPrice: 45000,
    status: "available",
    createdAt: "2024-01-20T14:30:00",
  },
  {
    id: "ORD-2024-002",
    restaurantName: "Sushi Express",
    pickupLocation: "789 Ocean Blvd, Seaside",
    dropoffLocation: "321 Hill Rd, Uptown",
    distance: 4.5,
    deliveryFee: 32000,
    totalPrice: 62000,
    status: "available",
    createdAt: "2024-01-20T14:25:00",
  },
  {
    id: "ORD-2024-003",
    restaurantName: "Burger House",
    pickupLocation: "555 Street St, Downtown",
    dropoffLocation: "888 Avenue Ave, Suburbs",
    distance: 2.1,
    deliveryFee: 18000,
    totalPrice: 38000,
    status: "available",
    createdAt: "2024-01-20T14:20:00",
  },
];

const MOCK_ACTIVE_ORDER: CourierOrder = {
  id: "ORD-2024-100",
  restaurantName: "Asian Kitchen",
  pickupLocation: "999 Food St, Restaurant District",
  dropoffLocation: "111 Home Lane, Residential",
  distance: 3.7,
  deliveryFee: 28000,
  totalPrice: 58000,
  status: "picked_up",
  customerName: "Батболд",
  customerPhone: "+976 9999 9999",
  instructions: "Хаалганы хонхыг хоёр дарж, үүдэнд үлдээнэ үү",
  createdAt: "2024-01-20T13:45:00",
  estimatedPickupTime: "2024-01-20T13:50:00",
  estimatedDeliveryTime: "2024-01-20T14:20:00",
};

const MOCK_COMPLETED_ORDERS: CourierOrder[] = [
  {
    id: "ORD-2024-050",
    restaurantName: "Pasta Perfetto",
    pickupLocation: "444 Noodle Way",
    dropoffLocation: "222 Delivery Point",
    distance: 2.8,
    deliveryFee: 22000,
    totalPrice: 42000,
    status: "delivered",
    createdAt: "2024-01-20T12:00:00",
  },
  {
    id: "ORD-2024-051",
    restaurantName: "Taco Tuesday",
    pickupLocation: "777 Flavor St",
    dropoffLocation: "333 Taste Ave",
    distance: 2.0,
    deliveryFee: 15000,
    totalPrice: 35000,
    status: "delivered",
    createdAt: "2024-01-20T11:30:00",
  },
];

const OrdersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrderTab>("available");
  const [activeOrderStatus, setActiveOrderStatus] = useState<
    "picked_up" | "on_way" | "delivered"
  >("picked_up");

  const handleAcceptOrder = (orderId: string) => {
    console.log("Accepted order:", orderId);
    alert(`Захиалга ${orderId} хүлээн авлаа!`);
  };

  const handleRejectOrder = (orderId: string) => {
    console.log("Rejected order:", orderId);
    alert(`Захиалга ${orderId}-аас татгалзлаа.`);
  };

  const handleMarkPickedUp = () => {
    setActiveOrderStatus("on_way");
    alert("Авсан гэж тэмдэглэлээ. Та одоо хүргэх замдаа явж байна!");
  };

  const handleMarkDelivered = () => {
    setActiveOrderStatus("delivered");
    alert("Захиалга хүргэгдлээ. Баярлалаа.");
  };

  const renderTabContent = () => {
    if (activeTab === "available") {
      return (
        <FlatList
          data={MOCK_AVAILABLE_ORDERS}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onAccept={handleAcceptOrder}
              onReject={handleRejectOrder}
            />
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    if (activeTab === "active") {
      return (
        <View style={styles.activeOrderContainer}>
          <OrderCard
            order={MOCK_ACTIVE_ORDER}
            showActions={false}
            onPress={() => {}}
          />

          {/* Order Status */}
          <View style={styles.statusSection}>
            <Text style={styles.statusSectionTitle}>Захиалгын төлөв</Text>
            <View style={styles.statusTimeline}>
              <StatusStep
                label="Авсан"
                isComplete={true}
                isActive={activeOrderStatus === "picked_up"}
              />
              <StatusStep
                label="Замдаа"
                isComplete={
                  activeOrderStatus === "on_way" ||
                  activeOrderStatus === "delivered"
                }
                isActive={activeOrderStatus === "on_way"}
              />
              <StatusStep
                label="Хүргэгдсэн"
                isComplete={activeOrderStatus === "delivered"}
                isActive={activeOrderStatus === "delivered"}
              />
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <Text style={styles.sectionTitle}>Харилцагчийн мэдээлэл</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Нэр</Text>
              <Text style={styles.infoValue}>
                {MOCK_ACTIVE_ORDER.customerName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Утас</Text>
              <TouchableOpacity>
                <Text style={[styles.infoValue, styles.phoneLink]}>
                  {MOCK_ACTIVE_ORDER.customerPhone}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Тайлбар</Text>
              <Text style={styles.infoValue}>
                {MOCK_ACTIVE_ORDER.instructions}
              </Text>
            </View>
          </View>

          {/* Map Placeholder */}
          <View style={styles.mapPlaceholder}>
            <Map size={40} color={Colors.textSoft} strokeWidth={2} />
            <Text style={styles.mapPlaceholderSubtext}>
              Газрын зургийн холболт удахгүй нэмэгдэнэ
            </Text>
            <Text style={styles.mapPlaceholderDistance}>
              Зай: {MOCK_ACTIVE_ORDER.distance.toFixed(1)} km
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {activeOrderStatus === "picked_up" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.onWayButton]}
                onPress={handleMarkPickedUp}
              >
                <Text style={styles.actionButtonText}>
                  <MapPin size={14} color={Colors.accent} strokeWidth={2} /> Замдаа
                </Text>
              </TouchableOpacity>
            )}
            {(activeOrderStatus === "picked_up" ||
              activeOrderStatus === "on_way") && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deliverButton]}
                onPress={handleMarkDelivered}
              >
                <Text style={styles.actionButtonText}>✓ Хүргэгдсэн гэж тэмдэглэх</Text>
              </TouchableOpacity>
            )}
            {activeOrderStatus === "delivered" && (
              <View style={styles.completedMessage}>
                <Text style={styles.completedText}>✓ Захиалга дууссан</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    // Completed tab
    return (
      <FlatList
        data={MOCK_COMPLETED_ORDERS}
        renderItem={({ item }) => (
          <OrderCard order={item} showActions={false} onPress={() => {}} />
        )}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Захиалгууд</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {["available", "active", "completed"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as OrderTab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === "available"
                  ? "Боломжит"
                  : tab === "active"
                    ? "Идэвхтэй"
                    : "Дууссан"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderTabContent()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

interface StatusStepProps {
  label: string;
  isComplete: boolean;
  isActive: boolean;
}

const StatusStep: React.FC<StatusStepProps> = ({
  label,
  isComplete,
  isActive,
}) => {
  return (
    <View style={styles.statusStep}>
      <View
        style={[
          styles.statusDot,
          isComplete && styles.statusDotComplete,
          isActive && styles.statusDotActive,
        ]}
      >
        {isComplete && <Text style={styles.statusDotText}>✓</Text>}
      </View>
      <Text
        style={[
          styles.statusLabel,
          (isComplete || isActive) && styles.statusLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: FontSize["2xl"],
    fontWeight: "700",
    color: Colors.text,
  },
  tabNavigation: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.button,
    alignItems: "center",
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primarySoftStrong,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSoft,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  listContent: {
    paddingTop: 12,
  },
  activeOrderContainer: {
    paddingBottom: 24,
  },
  statusSection: {
    marginHorizontal: Spacing.md,
    marginTop: 20,
    marginBottom: 16,
  },
  statusSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },
  statusTimeline: {
    gap: 12,
  },
  statusStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotComplete: {
    backgroundColor: Colors.primary,
  },
  statusDotActive: {
    backgroundColor: Colors.primaryDark,
    borderWidth: 2,
    borderColor: Colors.white,
    elevation: 2,
  },
  statusDotText: {
    color: Colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  statusLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  statusLabelActive: {
    color: Colors.text,
    fontWeight: "600",
  },
  customerSection: {
    marginHorizontal: Spacing.md,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSoft,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500",
  },
  phoneLink: {
    color: Colors.primaryPressed,
    textDecorationLine: "underline",
  },
  mapPlaceholder: {
    marginHorizontal: Spacing.md,
    marginBottom: 16,
    paddingVertical: 48,
    paddingHorizontal: 16,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.card,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.primary,
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 13,
    color: Colors.textSoft,
    marginBottom: 12,
  },
  mapPlaceholderDistance: {
    fontSize: FontSize.xs,
    color: Colors.primaryPressed,
    fontWeight: "600",
  },
  actionButtons: {
    marginHorizontal: Spacing.md,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  onWayButton: {
    backgroundColor: Colors.primarySoftStrong,
  },
  deliverButton: {
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  completedMessage: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.button,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  completedText: {
    color: Colors.primaryPressed,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default OrdersScreen;
