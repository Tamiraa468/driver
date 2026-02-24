import React, { useState } from "react";
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import OrderCard from "../../components/OrderCard";
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
  customerName: "John Doe",
  customerPhone: "+976 9999 9999",
  instructions: "Ring doorbell twice, leave at entrance",
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
    alert(`Order ${orderId} accepted!`);
  };

  const handleRejectOrder = (orderId: string) => {
    console.log("Rejected order:", orderId);
    alert(`Order ${orderId} rejected.`);
  };

  const handleMarkPickedUp = () => {
    setActiveOrderStatus("on_way");
    alert("Marked as picked up. You're now on the way!");
  };

  const handleMarkDelivered = () => {
    setActiveOrderStatus("delivered");
    alert("Order delivered! Thank you.");
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
            <Text style={styles.statusSectionTitle}>Order Status</Text>
            <View style={styles.statusTimeline}>
              <StatusStep
                label="Picked Up"
                isComplete={true}
                isActive={activeOrderStatus === "picked_up"}
              />
              <StatusStep
                label="On The Way"
                isComplete={
                  activeOrderStatus === "on_way" ||
                  activeOrderStatus === "delivered"
                }
                isActive={activeOrderStatus === "on_way"}
              />
              <StatusStep
                label="Delivered"
                isComplete={activeOrderStatus === "delivered"}
                isActive={activeOrderStatus === "delivered"}
              />
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {MOCK_ACTIVE_ORDER.customerName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <TouchableOpacity>
                <Text style={[styles.infoValue, styles.phoneLink]}>
                  {MOCK_ACTIVE_ORDER.customerPhone}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Instructions</Text>
              <Text style={styles.infoValue}>
                {MOCK_ACTIVE_ORDER.instructions}
              </Text>
            </View>
          </View>

          {/* Map Placeholder */}
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>🗺️</Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Map Integration Coming Soon
            </Text>
            <Text style={styles.mapPlaceholderDistance}>
              Distance: {MOCK_ACTIVE_ORDER.distance.toFixed(1)} km
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {activeOrderStatus === "picked_up" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.onWayButton]}
                onPress={handleMarkPickedUp}
              >
                <Text style={styles.actionButtonText}>📍 On The Way</Text>
              </TouchableOpacity>
            )}
            {(activeOrderStatus === "picked_up" ||
              activeOrderStatus === "on_way") && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deliverButton]}
                onPress={handleMarkDelivered}
              >
                <Text style={styles.actionButtonText}>✓ Mark Delivered</Text>
              </TouchableOpacity>
            )}
            {activeOrderStatus === "delivered" && (
              <View style={styles.completedMessage}>
                <Text style={styles.completedText}>✓ Order Completed</Text>
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
          <Text style={styles.title}>Orders</Text>
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
                  ? "Available"
                  : tab === "active"
                    ? "Active"
                    : "Completed"}
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
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  tabNavigation: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  tabActive: {
    backgroundColor: "#28a745",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  listContent: {
    paddingTop: 8,
  },
  activeOrderContainer: {
    paddingBottom: 24,
  },
  statusSection: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  statusSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
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
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotComplete: {
    backgroundColor: "#10b981",
  },
  statusDotActive: {
    backgroundColor: "#28a745",
    borderWidth: 2,
    borderColor: "#fff",
    boxShadow: "0px 0px 4px rgba(40, 167, 69, 0.3)",
    elevation: 3,
  },
  statusDotText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  statusLabel: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  statusLabelActive: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  customerSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  phoneLink: {
    color: "#0066cc",
    textDecorationLine: "underline",
  },
  mapPlaceholder: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 48,
    paddingHorizontal: 16,
    backgroundColor: "#f0f7ff",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#0066cc",
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  mapPlaceholderDistance: {
    fontSize: 12,
    color: "#0066cc",
    fontWeight: "600",
  },
  actionButtons: {
    marginHorizontal: 16,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  onWayButton: {
    backgroundColor: "#ffc107",
  },
  deliverButton: {
    backgroundColor: "#28a745",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  completedMessage: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#d4edda",
    borderRadius: 8,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  completedText: {
    color: "#155724",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default OrdersScreen;
