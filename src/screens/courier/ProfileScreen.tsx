import {
  AlertCircle,
  ChevronRight,
  Headphones,
  Info,
  Lightbulb,
  LogOut,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  HeroPanel,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  SummaryCard,
} from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";
import { supabase } from "../../config/supabaseClient";
import { useCourierAuth } from "../../context/CourierAuthContext";

type LucideIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface SummaryItem {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "neutral";
}

interface MenuItem {
  key: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

const PROFILE_FALLBACK = {
  vehicle: "Суудлын автомашин",
  score: 1250,
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Баталгаажсан",
  kyc_submitted: "Хяналт хүлээж байна",
  pending: "Хүлээгдэж байна",
  blocked: "Блоклогдсон",
};

const MENU_ITEMS: MenuItem[] = [
  {
    key: "support",
    icon: Headphones,
    label: "Тусламж",
    description: "Хүргэлтийн асуудал гарвал тусламж аваарай.",
  },
  {
    key: "tips",
    icon: Lightbulb,
    label: "Аппын зөвлөгөө",
    description: "Курьерын ажлын урсгалын товч зааврыг үзнэ үү.",
  },
  {
    key: "account",
    icon: Info,
    label: "Бүртгэлийн төлөв",
    description: "Баталгаажуулалт болон бүртгэлийн мэдээллээ шалгана уу.",
  },
];

const ProfileScreen: React.FC = () => {
  const { signOut, user } = useCourierAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [totalDeliveries, setTotalDeliveries] = useState<string>("—");
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    (async () => {
      const [profileRes, tasksRes] = await Promise.all([
        supabase.from("profiles").select("phone, status").eq("id", user.id).single(),
        supabase
          .from("delivery_tasks")
          .select("*", { count: "exact", head: true })
          .eq("courier_id", user.id)
          .eq("status", "delivered"),
      ]);

      if (cancelled) {
        return;
      }

      if (profileRes.data?.phone) {
        setPhone(profileRes.data.phone as string);
      }

      setTotalDeliveries(String(tasksRes.count ?? 0));
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const summaryItems = useMemo<SummaryItem[]>(
    () => [
      {
        key: "deliveries",
        icon: Truck,
        label: "Дууссан хүргэлт",
        value: totalDeliveries,
        hint: "Хүргэгдсэн бүх даалгавар",
        tone: "primary",
      },
      {
        key: "score",
        icon: Star,
        label: "Курьерын оноо",
        value: PROFILE_FALLBACK.score.toLocaleString(),
        hint: "Одоогийн дотоод оноо",
        tone: "neutral",
      },
      {
        key: "insurance",
        icon: ShieldCheck,
        label: "Даатгал",
        value: "Идэвхтэй",
        hint: "Курьерын хамгаалалтын төлөв",
        tone: "success",
      },
      {
        key: "status",
        icon: AlertCircle,
        label: "Бүртгэлийн төлөв",
        value: STATUS_LABELS[user?.status ?? ""] ?? "Тодорхойгүй",
        hint: "Баталгаажуулалт ба хандалт",
        tone: user?.status === "blocked" ? "warning" : "neutral",
      },
    ],
    [totalDeliveries, user?.status],
  );

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const doLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } catch {
      Alert.alert("Алдаа", "Гарахад алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Та гарахдаа итгэлтэй байна уу?")) {
        void doLogout();
      }
      return;
    }

    Alert.alert("Гарах", "Та гарахдаа итгэлтэй байна уу?", [
      { text: "Үгүй", style: "cancel" },
      { text: "Гарах", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  const handleMenuPress = (item: MenuItem) => {
    Alert.alert(item.label, item.description);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Профайл"
        subtitle="Бүртгэл, курьерын үзүүлэлт болон тусламжийн товчлолууд"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HeroPanel
          accessory={
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          }
          badgeLabel={STATUS_LABELS[user?.status ?? ""] ?? "Тодорхойгүй"}
          badgeTone={
            user?.status === "approved"
              ? "success"
              : user?.status === "blocked"
                ? "danger"
                : "default"
          }
          description={`${phone ?? "Утасны дугааргүй"} • ${PROFILE_FALLBACK.vehicle}`}
          eyebrow="Курьерын бүртгэл"
          metrics={[
            { label: "Дууссан", value: totalDeliveries },
            {
              label: "Оноо",
              value: PROFILE_FALLBACK.score.toLocaleString(),
            },
            { label: "Даатгал", value: "Идэвхтэй" },
          ]}
          style={styles.heroPanel}
          title={user?.full_name || "Курьер"}
        />

        <SectionTitle title="Үзүүлэлт" />
        <View style={styles.summaryGrid}>
          {summaryItems.map((item) => (
            <SummaryCard
              key={item.key}
              hint={item.hint}
              icon={item.icon}
              label={item.label}
              style={styles.summaryCard}
              tone={item.tone}
              value={item.value}
            />
          ))}
        </View>

        <SectionTitle title="Бүртгэлийн товчлол" />
        <Card>
          {MENU_ITEMS.map((item, index) => {
            const Icon = item.icon;

            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.78}
                onPress={() => handleMenuPress(item)}
                style={[
                  styles.menuRow,
                  index < MENU_ITEMS.length - 1 ? styles.menuDivider : null,
                ]}
              >
                <View style={styles.menuIcon}>
                  <Icon size={18} color={Colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                <ChevronRight
                  size={18}
                  color={Colors.textMuted}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            );
          })}
        </Card>

        <PrimaryButton
          title={loggingOut ? "Гарч байна..." : "Гарах"}
          onPress={handleLogout}
          disabled={loggingOut}
          style={styles.logoutButton}
          variant="outline"
          icon={<LogOut size={18} color={Colors.text} strokeWidth={2} />}
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
  heroPanel: {
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    width: "48.2%",
    marginBottom: Spacing.sm + 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 4,
  },
  menuDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 4,
  },
  menuTextWrap: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  menuLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: Spacing.lg,
  },
});

export default ProfileScreen;
