import { RealtimeChannel } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useState } from "react";
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
  claimDeliveryTask,
  fetchAvailableTasks,
  subscribeToAvailableTasks,
} from "../../services/deliveryTaskService";
import { AvailableTask } from "../../types/order";

export default function AvailableTasksScreen() {
  const [tasks, setTasks] = useState<AvailableTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      subscription = subscribeToAvailableTasks((updatedTasks) => {
        setTasks(updatedTasks);
      });
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchAvailableTasks();
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      Alert.alert("Error", "Failed to load available tasks");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, []);

  const handleClaimTask = async (taskId: string) => {
    try {
      setClaimingTaskId(taskId);

      const result = await claimDeliveryTask(taskId);

      if (result.success) {
        Alert.alert(
          "Success! 🎉",
          "Task assigned to you. Check your Active Deliveries.",
          [
            {
              text: "OK",
              onPress: () => {
                // Remove task from list immediately for better UX
                setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
              },
            },
          ],
        );
      } else {
        Alert.alert("Unable to Claim", result.message);
        // Refresh list in case task was claimed by someone else
        await loadTasks();
      }
    } catch (error) {
      console.error("Error claiming task:", error);
      Alert.alert("Error", "Failed to claim task. Please try again.");
    } finally {
      setClaimingTaskId(null);
    }
  };

  const formatFee = (fee: number) => {
    return `₮${fee.toLocaleString()}`;
  };

  const formatPackageValue = (value: number | null) => {
    if (!value) return null;
    return `₮${value.toLocaleString()}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const renderTaskCard = ({ item }: { item: AvailableTask }) => {
    const isClaimingThis = claimingTaskId === item.task_id;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Delivery Fee</Text>
            <Text style={styles.feeAmount}>{formatFee(item.delivery_fee)}</Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>Available</Text>
            <Text style={styles.timeAgo}>{formatTime(item.created_at)}</Text>
          </View>
        </View>

        {/* Package Value */}
        {item.package_value && (
          <View style={styles.packageValueRow}>
            <Text style={styles.packageIcon}>📦</Text>
            <Text style={styles.packageText}>
              Package Value: {formatPackageValue(item.package_value)}
            </Text>
          </View>
        )}

        {/* Pickup Location */}
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationDetails}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationAddress}>
              {item.pickup_address || "Address not available"}
            </Text>
            {item.pickup_note && (
              <Text style={styles.locationNote}>Note: {item.pickup_note}</Text>
            )}
          </View>
        </View>

        {/* Dropoff Location */}
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>🏁</Text>
          <View style={styles.locationDetails}>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.locationAddress}>
              {item.dropoff_address || "Address not available"}
            </Text>
            {item.dropoff_note && (
              <Text style={styles.locationNote}>Note: {item.dropoff_note}</Text>
            )}
            {item.receiver_name && (
              <Text style={styles.receiverInfo}>To: {item.receiver_name}</Text>
            )}
            {item.receiver_phone && (
              <Text style={styles.receiverInfo}>📞 {item.receiver_phone}</Text>
            )}
          </View>
        </View>

        {/* Notes/Instructions */}
        {item.note && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsLabel}>📝 Note:</Text>
            <Text style={styles.instructionsText}>{item.note}</Text>
          </View>
        )}

        {/* Accept Button */}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            isClaimingThis && styles.acceptButtonDisabled,
          ]}
          onPress={() => handleClaimTask(item.task_id)}
          disabled={isClaimingThis}
        >
          {isClaimingThis ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept Delivery</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading available tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Tasks</Text>
        <Text style={styles.headerSubtitle}>
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} available
        </Text>
      </View>

      {/* Task List */}
      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No tasks available</Text>
          <Text style={styles.emptySubtitle}>
            New delivery tasks will appear here
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadTasks}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.task_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  feeContainer: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34C759",
  },
  badgeContainer: {
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: "#E3F2FD",
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeAgo: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  packageValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  packageIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  packageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  locationRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 15,
    color: "#000",
    lineHeight: 20,
  },
  locationNote: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  receiverInfo: {
    fontSize: 13,
    color: "#333",
    marginTop: 4,
  },
  instructionsContainer: {
    backgroundColor: "#FFF8E1",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F57C00",
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
  acceptButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: "#B0B0B0",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
