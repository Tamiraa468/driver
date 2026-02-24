/**
 * Pending Approval Screen
 *
 * Shown to couriers whose account is pending admin approval.
 * Includes refresh button to check if status has been updated.
 */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCourierAuth } from "../../context/CourierAuthContext";

const PendingApprovalScreen: React.FC = () => {
  const { user, refreshStatus, signOut, isLoading, accessStatus } =
    useCourierAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshStatus]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⏳</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Баталгаажуулалт хүлээгдэж байна</Text>

          {/* Message */}
          <Text style={styles.message}>
            Таны бүртгэлийг админ шалгаж байна. Баталгаажсаны дараа та хүргэлт
            хүлээн авах боломжтой болно.
          </Text>

          {/* User Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>И-мэйл:</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Нэр:</Text>
              <Text style={styles.infoValue}>
                {user?.full_name || "Оруулаагүй"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Төлөв:</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Хүлээгдэж байна</Text>
              </View>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Юу хэрэгтэй вэ?</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>Хүчин төгөлдөр иргэний үнэмлэх</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>
                Тээврийн хэрэгслийн бичиг баримт
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>✓</Text>
              <Text style={styles.tipText}>Утасны дугаар баталгаажуулалт</Text>
            </View>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            {isLoading || isRefreshing ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <>
                <Text style={styles.refreshIcon}>🔄</Text>
                <Text style={styles.refreshButtonText}>Төлөв шалгах</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={isLoading}
          >
            <Text style={styles.signOutButtonText}>Гарах</Text>
          </TouchableOpacity>

          {/* Support Info */}
          <View style={styles.supportContainer}>
            <Text style={styles.supportText}>
              Асуулт байвал бидэнтэй холбогдоно уу
            </Text>
            <TouchableOpacity>
              <Text style={styles.supportLink}>support@delivery.mn</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff8e6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  statusBadge: {
    backgroundColor: "#fff8e6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#f5a623",
    fontSize: 12,
    fontWeight: "600",
  },
  tipsContainer: {
    width: "100%",
    backgroundColor: "#f0f7ff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tipBullet: {
    fontSize: 16,
    color: "#34c759",
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: "#666",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f7ff",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
  },
  refreshIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  refreshButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  signOutButtonText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "500",
  },
  supportContainer: {
    marginTop: "auto",
    alignItems: "center",
    paddingTop: 24,
  },
  supportText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  supportLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});

export default PendingApprovalScreen;
