import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { DollarSign, MapPin, Package, Zap } from "lucide-react-native";
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

type CourierWelcomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const FEATURES = [
  {
    icon: DollarSign,
    title: "Уян орлого",
    description: "Хүргэлтийн орлого болон дууссан ажлуудаа нэг дороос хянаарай.",
  },
  {
    icon: MapPin,
    title: "Тодорхой маршрут",
    description: "Даалгаврын дэлгэрэнгүйг нээж, авах цэгээс хүргэх цэг рүү хурдан шилжинэ.",
  },
  {
    icon: Zap,
    title: "Хурдан эхлэл",
    description: "Баталгаажуулаад, төвлөрсөн ажлын урсгалаар хүргэлтээ эхлүүлээрэй.",
  },
];

const CourierWelcomeScreen: React.FC<CourierWelcomeScreenProps> = ({
  navigation,
}) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View>
          <HeroPanel
            accessory={
              <View style={styles.logoCircle}>
                <Package size={34} color={Colors.primaryDark} strokeWidth={2} />
              </View>
            }
            description="Өдөр тутмын хүргэлтийн ажилд зориулсан, хурдан шалгах, ойлгомжтой маршрут, энгийн орлогын хяналттай орчин."
            eyebrow="Курьерын орчин"
            metrics={[
              { label: "Курьер", value: "1000+" },
              { label: "Хүргэлт", value: "50K+" },
              { label: "Үнэлгээ", value: "4.8★" },
            ]}
            style={styles.hero}
            title="Курьер"
          />

          <View style={styles.features}>
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card key={feature.title} style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Icon
                      size={18}
                      color={Colors.primaryDark}
                      strokeWidth={2}
                    />
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
            onPress={() => navigation.navigate("CourierLogin")}
          />
          <PrimaryButton
            title="Курьер болох"
            onPress={() => navigation.navigate("CourierRegister")}
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
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  features: {
    gap: Spacing.sm + 4,
    marginBottom: Spacing.lg,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
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

export default CourierWelcomeScreen;
