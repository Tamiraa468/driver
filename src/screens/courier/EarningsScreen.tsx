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
import { CourierEarning } from "../../types/order";

type TimePeriod = "today" | "week" | "month";

const MOCK_EARNINGS: CourierEarning[] = [
  {
    id: "1",
    orderId: "ORD-001",
    amount: 25000,
    deliveryDistance: 3.2,
    completedAt: "2024-01-20T14:30:00",
  },
  {
    id: "2",
    orderId: "ORD-002",
    amount: 18000,
    deliveryDistance: 2.1,
    completedAt: "2024-01-20T13:15:00",
  },
  {
    id: "3",
    orderId: "ORD-003",
    amount: 32000,
    deliveryDistance: 4.5,
    completedAt: "2024-01-20T11:45:00",
  },
  {
    id: "4",
    orderId: "ORD-004",
    amount: 22000,
    deliveryDistance: 2.8,
    completedAt: "2024-01-20T10:20:00",
  },
  {
    id: "5",
    orderId: "ORD-005",
    amount: 28000,
    deliveryDistance: 3.7,
    completedAt: "2024-01-19T18:00:00",
  },
];

interface EarningsSummary {
  totalEarnings: number;
  deliveryCount: number;
  totalDistance: number;
  averagePerDelivery: number;
}

const EarningsScreen: React.FC = () => {
  const [period, setPeriod] = useState<TimePeriod>("today");

  // Mock data for different periods
  const getSummaryByPeriod = (selectedPeriod: TimePeriod): EarningsSummary => {
    switch (selectedPeriod) {
      case "today":
        return {
          totalEarnings: 125000,
          deliveryCount: 5,
          totalDistance: 16.3,
          averagePerDelivery: 25000,
        };
      case "week":
        return {
          totalEarnings: 850000,
          deliveryCount: 32,
          totalDistance: 118.5,
          averagePerDelivery: 26562.5,
        };
      case "month":
        return {
          totalEarnings: 3480000,
          deliveryCount: 135,
          totalDistance: 512.0,
          averagePerDelivery: 25777.78,
        };
    }
  };

  const summary = getSummaryByPeriod(period);

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
  };

  const renderEarningItem = ({ item }: { item: CourierEarning }) => {
    const date = new Date(item.completedAt);
    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View style={styles.earningItem}>
        <View style={styles.earningLeft}>
          <View style={styles.earningIcon}>
            <Text style={styles.earningIconText}>📦</Text>
          </View>
          <View style={styles.earningDetails}>
            <Text style={styles.earningOrderId}>{item.orderId}</Text>
            <Text style={styles.earningDistance}>
              {item.deliveryDistance.toFixed(1)} km
            </Text>
          </View>
        </View>
        <View style={styles.earningRight}>
          <Text style={styles.earningAmount}>+₮{item.amount}</Text>
          <Text style={styles.earningTime}>{time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings</Text>
        </View>

        {/* Period Toggle */}
        <View style={styles.periodToggle}>
          {["today", "week", "month"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => handlePeriodChange(p as TimePeriod)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive,
                ]}
              >
                {p === "today" ? "Today" : p === "week" ? "Week" : "Month"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Cards */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryMainContent}>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
              <Text style={styles.summaryMainValue}>
                ₮{summary.totalEarnings.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Deliveries</Text>
                <Text style={styles.summaryItemValue}>
                  {summary.deliveryCount}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Distance</Text>
                <Text style={styles.summaryItemValue}>
                  {summary.totalDistance.toFixed(1)} km
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Avg/Delivery</Text>
                <Text style={styles.summaryItemValue}>
                  ₮{Math.round(summary.averagePerDelivery).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Earnings History */}
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>Delivery History</Text>
            {period === "today" ? (
              <FlatList
                data={MOCK_EARNINGS}
                renderItem={renderEarningItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : (
              <View style={styles.placeholderMessage}>
                <Text style={styles.placeholderText}>
                  {period === "week"
                    ? "Week data will show 32 deliveries"
                    : "Month data will show 135 deliveries"}
                </Text>
              </View>
            )}
          </View>

          {/* Breakdown */}
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Base delivery fee</Text>
              <Text style={styles.breakdownValue}>70%</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Distance bonus</Text>
              <Text style={styles.breakdownValue}>20%</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Surge pricing</Text>
              <Text style={styles.breakdownValue}>10%</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
  periodToggle: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#28a745",
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  periodButtonTextActive: {
    color: "#fff",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  summaryMainContent: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  summaryMainValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#10b981",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#d1fae5",
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  historySection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  earningItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  earningLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  earningIconText: {
    fontSize: 20,
  },
  earningDetails: {
    flex: 1,
  },
  earningOrderId: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  earningDistance: {
    fontSize: 12,
    color: "#666",
  },
  earningRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  earningAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10b981",
  },
  earningTime: {
    fontSize: 11,
    color: "#999",
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  placeholderMessage: {
    paddingVertical: 24,
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 13,
    color: "#999",
  },
  breakdownSection: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#666",
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
});

export default EarningsScreen;
