import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CourierOrder } from "../types/order";

interface OrderCardProps {
  order: CourierOrder;
  onAccept?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onPress?: (orderId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onAccept,
  onReject,
  onPress,
  showActions = true,
  compact = false,
}) => {
  return (
    <Pressable
      onPress={() => onPress?.(order.id)}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.restaurant}>{order.restaurantName}</Text>
          <Text style={styles.fee}>Delivery: ₮{order.deliveryFee}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            order.status === "available" && styles.statusAvailable,
            order.status === "accepted" && styles.statusAccepted,
            order.status === "picked_up" && styles.statusPickedUp,
            order.status === "on_way" && styles.statusOnWay,
            order.status === "delivered" && styles.statusDelivered,
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
        </View>
      </View>

      <View style={styles.locations}>
        <View style={styles.location}>
          <Text style={styles.locationLabel}>📍 Pickup</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {order.pickupLocation}
          </Text>
        </View>
        <View style={styles.location}>
          <Text style={styles.locationLabel}>🎯 Dropoff</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {order.dropoffLocation}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Distance</Text>
          <Text style={styles.detailValue}>{order.distance.toFixed(1)} km</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Price</Text>
          <Text style={styles.detailValue}>₮{order.totalPrice}</Text>
        </View>
      </View>

      {showActions && order.status === "available" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => onReject?.(order.id)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => onAccept?.(order.id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
};

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "Available",
    accepted: "Accepted",
    picked_up: "Picked Up",
    on_way: "On The Way",
    delivered: "Delivered",
  };
  return labels[status] || status;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  cardCompact: {
    marginVertical: 6,
    padding: 12,
  },
  cardPressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  restaurant: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  fee: {
    fontSize: 14,
    fontWeight: "600",
    color: "#28a745",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusAvailable: {
    backgroundColor: "#e3f2fd",
  },
  statusAccepted: {
    backgroundColor: "#fff3cd",
  },
  statusPickedUp: {
    backgroundColor: "#d1ecf1",
  },
  statusOnWay: {
    backgroundColor: "#f8d7da",
  },
  statusDelivered: {
    backgroundColor: "#d4edda",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  locations: {
    marginBottom: 12,
    gap: 8,
  },
  location: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  rejectButton: {
    backgroundColor: "#f0f0f0",
  },
  rejectButtonText: {
    color: "#666",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default OrderCard;
