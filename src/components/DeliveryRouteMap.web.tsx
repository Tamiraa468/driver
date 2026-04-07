import { MapPinned, Navigation } from "lucide-react-native";
import React, { useCallback } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../constants/design";
import { Card, PrimaryButton, SectionTitle } from "./ui";

export interface DeliveryRouteMapProps {
  destination: { latitude: number; longitude: number };
  destinationTitle?: string;
}

function buildGoogleMapsUrl(
  destination: DeliveryRouteMapProps["destination"],
): string {
  return (
    "https://www.google.com/maps/dir/?api=1" +
    `&destination=${encodeURIComponent(
      `${destination.latitude},${destination.longitude}`,
    )}` +
    "&travelmode=driving"
  );
}

const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  destination,
  destinationTitle = "Хүргэлтийн цэг",
}) => {
  const openGoogleMaps = useCallback(async () => {
    try {
      await Linking.openURL(buildGoogleMapsUrl(destination));
    } catch (error) {
      console.error("[DeliveryRouteMap:web] Failed to open Google Maps:", error);
      Alert.alert(
        "Google Maps нээж чадсангүй",
        "Түр хүлээгээд дахин оролдоно уу.",
      );
    }
  }, [destination]);

  return (
    <Card variant="elevated" style={styles.card}>
      <SectionTitle title="Хүргэлтийн маршрут" />

      <Text style={styles.destinationLabel}>Хүргэх цэг</Text>
      <Text numberOfLines={2} style={styles.destinationTitle}>
        {destinationTitle}
      </Text>

      <View style={styles.placeholder}>
        <MapPinned size={28} color={Colors.text} strokeWidth={2} />
        <Text style={styles.placeholderTitle}>Газрын зургийн урьдчилсан харагдац зөвхөн гар утсанд ажиллана</Text>
        <Text style={styles.placeholderText}>
          Курьерын тэмдэглэгээ болон маршрутын шугамыг харахын тулд энэ дэлгэцийг iOS эсвэл Android дээр нээнэ үү.
        </Text>
      </View>

      <PrimaryButton
        title="Google Maps дээр нээх"
        onPress={() => {
          void openGoogleMaps();
        }}
        icon={<Navigation size={18} color={Colors.white} strokeWidth={2} />}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  destinationLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  destinationTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  placeholder: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  placeholderTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    lineHeight: 20,
    textAlign: "center",
  },
});

export default DeliveryRouteMap;
