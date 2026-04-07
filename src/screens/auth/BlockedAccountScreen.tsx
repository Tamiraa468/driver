import { Ban, Mail, Phone } from "lucide-react-native";
import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  ListItemCard,
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
  Spacing,
} from "../../constants/design";
import { useCourierAuth } from "../../context/CourierAuthContext";

const BlockedAccountScreen: React.FC = () => {
  const { user, signOut } = useCourierAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScreenHeader
          title="Бүртгэл блоклогдсон"
          subtitle="Таны курьерын бүртгэлийн хандалт одоогоор хязгаарлагдсан байна."
        />

        <StateView
          icon={<Ban size={28} color={Colors.danger} strokeWidth={2} />}
          title="Бүртгэл блоклогдсон"
          description="Уучлаарай, таны бүртгэл түр хугацаанд блоклогдсон байна. Дэлгэрэнгүй мэдээлэл авахыг хүсвэл дэмжлэгийн багтай холбогдоно уу."
          style={styles.heroCard}
        />

        <Card style={styles.infoCard}>
          <Text style={styles.sectionLabel}>Бүртгэлийн мэдээлэл</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>И-мэйл</Text>
            <Text style={styles.infoValue}>{user?.email ?? "Мэдээлэлгүй"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Төлөв</Text>
            <StatusBadge label="Блоклогдсон" status="danger" />
          </View>
        </Card>

        <ListItemCard
          badgeLabel="Тусламж"
          badgeTone="info"
          leading={<Mail size={18} color={Colors.primaryDark} strokeWidth={2} />}
          onPress={() =>
            void Linking.openURL(
              "mailto:support@delivery.mn?subject=Account%20Blocked%20Inquiry",
            )
          }
          style={styles.listCard}
          subtitle="support@delivery.mn"
          title="И-мэйл илгээх"
        />

        <ListItemCard
          badgeLabel="Лавлах утас"
          badgeTone="default"
          leading={<Phone size={18} color={Colors.primaryDark} strokeWidth={2} />}
          onPress={() => void Linking.openURL("tel:+97677001234")}
          style={styles.listCard}
          subtitle="7700-1234"
          title="Тусламж руу залгах"
        />

        <PrimaryButton
          title="Гарах"
          onPress={() => {
            void signOut();
          }}
          style={styles.button}
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
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
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  listCard: {
    marginBottom: Spacing.sm + 4,
  },
  button: {
    marginTop: "auto",
    marginBottom: Spacing.xl,
  },
});

export default BlockedAccountScreen;
