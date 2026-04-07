import { CircleDot, MapPin } from "lucide-react-native";
import React from "react";
import {
  Pressable,
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
} from "../constants/design";
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
          <Text style={styles.fee}>Хүргэлт: ₮{order.deliveryFee}</Text>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={14} color={Colors.primaryDark} strokeWidth={2} />
            <Text style={styles.locationLabel}>Авах цэг</Text>
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {order.pickupLocation}
          </Text>
        </View>
        <View style={styles.location}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <CircleDot size={14} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.locationLabel}>Хүргэх цэг</Text>
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {order.dropoffLocation}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Зай</Text>
          <Text style={styles.detailValue}>{order.distance.toFixed(1)} km</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Нийт үнэ</Text>
          <Text style={styles.detailValue}>₮{order.totalPrice}</Text>
        </View>
      </View>

      {showActions && order.status === "available" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => onReject?.(order.id)}
          >
            <Text style={styles.rejectButtonText}>Татгалзах</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => onAccept?.(order.id)}
          >
            <Text style={styles.acceptButtonText}>Хүлээн авах</Text>
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
};

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "Нээлттэй",
    accepted: "Хүлээн авсан",
    picked_up: "Авсан",
    on_way: "Замдаа",
    delivered: "Хүргэгдсэн",
  };
  return labels[status] || status;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.card,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
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
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  fee: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primaryDark,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusAvailable: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoftStrong,
  },
  statusAccepted: {
    backgroundColor: Colors.surface,
  },
  statusPickedUp: {
    backgroundColor: Colors.infoSoft,
    borderColor: "#C8D5FF",
  },
  statusOnWay: {
    backgroundColor: Colors.warningSoft,
  },
  statusDelivered: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.primarySoftStrong,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.text,
  },
  locations: {
    marginBottom: 12,
    gap: 8,
  },
  location: {
    backgroundColor: Colors.accentSoft,
    padding: 10,
    borderRadius: 8,
  },
  locationLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSoft,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSoft,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
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
    backgroundColor: Colors.accent,
  },
  acceptButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  rejectButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rejectButtonText: {
    color: Colors.textSoft,
    fontWeight: "700",
    fontSize: 14,
  },
});

export default OrderCard;
