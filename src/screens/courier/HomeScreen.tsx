import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import StatusToggle from "../../components/StatusToggle";

interface DashboardStats {
  deliveriesToday: number;
  earningsToday: number;
  rating: number;
}

const HomeScreen: React.FC = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    deliveriesToday: 5,
    earningsToday: 125000,
    rating: 4.8,
  });

  // Mock location (would be replaced with actual GPS)
  const mockLocation = "Sukhbaatar District, Ulaanbaatar";

  const handleToggleOnline = (value: boolean) => {
    setIsOnline(value);
    // Here you would trigger API calls to update online status
    // and potentially start/stop location tracking
    if (value) {
      console.log("Courier went online");
      // Start watching location, connect to real-time order updates
    } else {
      console.log("Courier went offline");
      // Stop watching location, disconnect from order updates
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, Courier</Text>
        </View>

        {/* Online Status Toggle */}
        <StatusToggle
          isOnline={isOnline}
          onToggle={handleToggleOnline}
          label="Your Status"
        />

        {/* Current Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Your Location</Text>
          <Text style={styles.locationText}>{mockLocation}</Text>
          <TouchableOpacity style={styles.updateLocationButton}>
            <Text style={styles.updateLocationButtonText}>Update Location</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardDeliveries]}>
            <Text style={styles.statLabel}>Deliveries Today</Text>
            <Text style={styles.statValue}>{stats.deliveriesToday}</Text>
            <Text style={styles.statSubtext}>In progress & completed</Text>
          </View>

          <View style={[styles.statCard, styles.statCardEarnings]}>
            <Text style={styles.statLabel}>Earnings Today</Text>
            <Text style={styles.statValue}>₮{stats.earningsToday}</Text>
            <Text style={styles.statSubtext}>Total commission</Text>
          </View>

          <View style={[styles.statCard, styles.statCardRating]}>
            <Text style={styles.statLabel}>Your Rating</Text>
            <Text style={styles.statValue}>{stats.rating.toFixed(1)} ⭐</Text>
            <Text style={styles.statSubtext}>Based on reviews</Text>
          </View>
        </View>

        {/* Primary CTA */}
        {isOnline ? (
          <TouchableOpacity
            style={[styles.primaryButton, styles.primaryButtonActive]}
            disabled={false}
          >
            <Text style={styles.primaryButtonText}>🔍 Find Orders</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.offlineMessage}>
            <Text style={styles.offlineMessageText}>
              Go online to start accepting orders
            </Text>
          </View>
        )}

        {/* Quick Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Tips for Success</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>✓</Text>
            <Text style={styles.infoText}>
              Keep your profile updated with accurate info
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>✓</Text>
            <Text style={styles.infoText}>
              Maintain high rating for more orders
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>✓</Text>
            <Text style={styles.infoText}>
              Keep your phone charged and location enabled
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  locationCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    backgroundColor: "#f0f7ff",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 12,
    lineHeight: 20,
  },
  updateLocationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0066cc",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  updateLocationButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderTopRightRadius: 12,
  },
  statCardDeliveries: {
    backgroundColor: "#f0f9ff",
    borderLeftColor: "#3b82f6",
  },
  statCardEarnings: {
    backgroundColor: "#f0fdf4",
    borderLeftColor: "#10b981",
  },
  statCardRating: {
    backgroundColor: "#fff7ed",
    borderLeftColor: "#f59e0b",
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: "#999",
  },
  primaryButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ccc",
  },
  primaryButtonActive: {
    backgroundColor: "#28a745",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  offlineMessage: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff3cd",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  offlineMessageText: {
    color: "#856404",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  infoSection: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  infoBullet: {
    fontSize: 16,
    marginRight: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
});

export default HomeScreen;
