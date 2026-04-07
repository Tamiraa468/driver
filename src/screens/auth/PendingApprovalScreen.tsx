import { Hourglass, RefreshCw } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  PrimaryButton,
  ScreenHeader,
  StateView,
  StatusBadge,
} from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";
import { useCourierAuth } from "../../context/CourierAuthContext";

const REQUIREMENTS = [
  "Хүчин төгөлдөр иргэний үнэмлэх",
  "Тээврийн хэрэгслийн бичиг баримт",
  "Утасны дугаар баталгаажуулалт",
];

const PendingApprovalScreen: React.FC = () => {
  const { user, refreshStatus, signOut, isLoading } = useCourierAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshStatus]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Баталгаажуулалт хүлээгдэж байна"
          subtitle="Таны курьерын бүртгэл админы хяналт хүлээж байна."
        />

        <StateView
          icon={<Hourglass size={28} color={Colors.warning} strokeWidth={2} />}
          title="Баталгаажуулалт хүлээгдэж байна"
          description="Таны бүртгэлийг админ шалгаж байна. Баталгаажсаны дараа та хүргэлт хүлээн авах боломжтой болно."
          style={styles.heroCard}
        />

        <Card style={styles.infoCard}>
          <Text style={styles.sectionLabel}>Бүртгэлийн мэдээлэл</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>И-мэйл</Text>
            <Text style={styles.infoValue}>{user?.email ?? "Мэдээлэлгүй"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Нэр</Text>
            <Text style={styles.infoValue}>
              {user?.full_name || "Оруулаагүй"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Төлөв</Text>
            <StatusBadge label="Хяналт хүлээж байна" status="warning" />
          </View>
        </Card>

        <Card style={styles.requirementsCard} variant="subtle">
          <Text style={styles.sectionTitle}>Юу хэрэгтэй вэ?</Text>
          {REQUIREMENTS.map((item) => (
            <View key={item} style={styles.requirementRow}>
              <View style={styles.dot} />
              <Text style={styles.requirementText}>{item}</Text>
            </View>
          ))}
        </Card>

        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => {
            void handleRefresh();
          }}
          style={styles.refreshHint}
        >
          <RefreshCw size={16} color={Colors.primaryDark} strokeWidth={2} />
          <Text style={styles.refreshHintText}>
            Доош татаж шинэчлэх эсвэл энд дарж төлөвөө дахин шалгана уу.
          </Text>
        </TouchableOpacity>

        <PrimaryButton
          title="Төлөв шалгах"
          onPress={() => {
            void handleRefresh();
          }}
          loading={isLoading || isRefreshing}
          style={styles.primaryButton}
        />

        <PrimaryButton
          title="Гарах"
          onPress={() => {
            void signOut();
          }}
          disabled={isLoading}
          variant="outline"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    marginBottom: Spacing.md,
  },
  infoCard: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSoft,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  requirementsCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    marginRight: Spacing.sm,
  },
  requirementText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  refreshHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  refreshHintText: {
    marginLeft: Spacing.xs + 2,
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  primaryButton: {
    marginBottom: Spacing.sm + 4,
  },
});

export default PendingApprovalScreen;
