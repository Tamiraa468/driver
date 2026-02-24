/**
 * Account Blocked Screen
 *
 * Shown to couriers whose account has been blocked/suspended.
 * Provides contact information for support.
 */

import React from "react";
import {
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCourierAuth } from "../../context/CourierAuthContext";

const BlockedAccountScreen: React.FC = () => {
  const { user, signOut } = useCourierAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleContactSupport = () => {
    Linking.openURL(
      "mailto:support@delivery.mn?subject=Account%20Blocked%20Inquiry",
    );
  };

  const handleCallSupport = () => {
    Linking.openURL("tel:+97677001234");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚫</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Бүртгэл блоклогдсон</Text>

        {/* Message */}
        <Text style={styles.message}>
          Уучлаарай, таны бүртгэл түр хугацаанд блоклогдсон байна. Дэлгэрэнгүй
          мэдээлэл авахыг хүсвэл дэмжлэгийн багтай холбогдоно уу.
        </Text>

        {/* User Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>И-мэйл:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Төлөв:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Блоклогдсон</Text>
            </View>
          </View>
        </View>

        {/* Contact Options */}
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Холбоо барих</Text>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactSupport}
          >
            <Text style={styles.contactIcon}>📧</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>И-мэйл илгээх</Text>
              <Text style={styles.contactValue}>support@delivery.mn</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleCallSupport}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Утсаар холбогдох</Text>
              <Text style={styles.contactValue}>7700-1234</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Гарах</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    backgroundColor: "#ffebeb",
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
    color: "#ff3b30",
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
    backgroundColor: "#ffebeb",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#ff3b30",
    fontSize: 12,
    fontWeight: "600",
  },
  contactContainer: {
    width: "100%",
    marginBottom: 24,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: "auto",
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  signOutButtonText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default BlockedAccountScreen;
