import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapPin, Rocket, UtensilsCrossed, Zap } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, HeroPanel, PrimaryButton } from "../../components/ui";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: "Хялбар захиалга",
    description: "Хоолны сонголтуудаа цэвэр, хөнгөн захиалгын урсгалаар үзээрэй.",
  },
  {
    icon: Zap,
    title: "Хурдан хүргэлт",
    description: "Захиалгаа хянаж, сагсаас хүргэлт рүү саадгүй шилжинэ.",
  },
  {
    icon: MapPin,
    title: "Шууд шинэчлэлт",
    description: "Хаяг болон хүргэлтийн явцаа нэг цэгээс тогтвортой харна.",
  },
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View>
          <HeroPanel
            accessory={
              <View style={styles.logoCircle}>
                <Rocket size={32} color={Colors.text} strokeWidth={2} />
              </View>
            }
            description="Ойлгомжтой, хурдан шийдвэр гаргах, уншихад тав тухтай хүргэлтийн энгийн орчин."
            eyebrow="Хүргэлтийн орчин"
            metrics={[
              { label: "Захиалга", value: "24/7" },
              { label: "Хяналт", value: "Шууд" },
              { label: "Явц", value: "Энгийн" },
            ]}
            style={styles.hero}
            title="Хүргэлтийн апп"
          />

          <View style={styles.features}>
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card key={feature.title} style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Icon size={18} color={Colors.text} strokeWidth={2} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        <View style={styles.buttons}>
          <PrimaryButton
            title="Нэвтрэх"
            onPress={() => navigation.navigate("Login")}
          />
          <PrimaryButton
            title="Бүртгүүлэх"
            onPress={() => navigation.navigate("Register")}
            variant="secondary"
          />
        </View>
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
    justifyContent: "space-between",
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  hero: {
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  features: {
    gap: Spacing.sm + 4,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 4,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  buttons: {
    gap: Spacing.sm + 4,
  },
});

export default WelcomeScreen;
