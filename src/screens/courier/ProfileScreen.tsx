import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CourierProfile } from "../../types/order";

const MOCK_PROFILE: CourierProfile = {
  id: "COURIER-001",
  name: "Alexander Johnson",
  phone: "+976 9999 8888",
  vehicleType: "bike",
  rating: 4.8,
  totalDeliveries: 142,
  isOnline: false,
};

const ProfileScreen: React.FC = () => {
  const [profile] = useState<CourierProfile>(MOCK_PROFILE);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: () => {
          console.log("User logged out");
          alert("Logged out successfully!");
        },
        style: "destructive",
      },
    ]);
  };

  const handleEditProfile = () => {
    alert("Edit profile feature coming soon");
  };

  const getVehicleEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      bike: "🚴",
      scooter: "🛴",
      car: "🚗",
    };
    return emojis[type] || "🚴";
  };

  const getVehicleLabel = (type: string) => {
    const labels: Record<string, string> = {
      bike: "Bicycle",
      scooter: "Scooter",
      car: "Car",
    };
    return labels[type] || "Bicycle";
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
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Text style={styles.editAvatarButtonText}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profilePhone}>{profile.phone}</Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {[...Array(5)].map((_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.star,
                    i < Math.floor(profile.rating) && styles.starFilled,
                    i === Math.floor(profile.rating) &&
                      profile.rating % 1 > 0 &&
                      styles.starHalf,
                  ]}
                >
                  ★
                </Text>
              ))}
            </View>
            <Text style={styles.ratingValue}>{profile.rating.toFixed(1)}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Deliveries</Text>
              <Text style={styles.statValue}>{profile.totalDeliveries}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Vehicle Type</Text>
              <Text style={styles.statValue}>
                {getVehicleEmoji(profile.vehicleType)}
              </Text>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editProfileButtonText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{profile.name}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{profile.phone}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Vehicle Type</Text>
            <Text style={styles.detailValue}>
              {getVehicleLabel(profile.vehicleType)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Courier ID</Text>
            <Text style={styles.detailValue}>{profile.id}</Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionLabel}>🔐 Change Password</Text>
            <Text style={styles.accountOptionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionLabel}>🔔 Notifications</Text>
            <Text style={styles.accountOptionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionLabel}>⚙️ Preferences</Text>
            <Text style={styles.accountOptionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionLabel}>💬 Help & Support</Text>
            <Text style={styles.accountOptionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Performance</Text>

          <View style={styles.statGroup}>
            <View style={styles.statGroupItem}>
              <Text style={styles.statGroupLabel}>Acceptance Rate</Text>
              <Text style={styles.statGroupValue}>92%</Text>
            </View>
            <View style={styles.statGroupItem}>
              <Text style={styles.statGroupLabel}>On-Time Rate</Text>
              <Text style={styles.statGroupValue}>98%</Text>
            </View>
            <View style={styles.statGroupItem}>
              <Text style={styles.statGroupLabel}>Cancellation Rate</Text>
              <Text style={styles.statGroupValue}>2%</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>App Version 1.0.0</Text>
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
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  profileCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "#f0f7ff",
    borderRadius: 16,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0066cc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#28a745",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  editAvatarButtonText: {
    fontSize: 14,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  ratingStars: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontSize: 16,
    color: "#ddd",
  },
  starFilled: {
    color: "#ffc107",
  },
  starHalf: {
    color: "#ffc107",
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#d0e8ff",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0066cc",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#d0e8ff",
  },
  editProfileButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#0066cc",
    alignItems: "center",
  },
  editProfileButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  detailsSection: {
    marginHorizontal: 16,
    marginVertical: 16,
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
  detailItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  accountSection: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 0,
  },
  accountOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
  },
  accountOptionLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  accountOptionArrow: {
    fontSize: 18,
    color: "#ccc",
  },
  statsSection: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  statGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statGroupItem: {
    alignItems: "center",
  },
  statGroupLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 6,
  },
  statGroupValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10b981",
  },
  logoutButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#fff5f5",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#f08080",
  },
  logoutButtonText: {
    color: "#dc3545",
    fontSize: 15,
    fontWeight: "700",
  },
  versionInfo: {
    alignItems: "center",
    paddingVertical: 12,
  },
  versionText: {
    fontSize: 12,
    color: "#999",
  },
});

export default ProfileScreen;
