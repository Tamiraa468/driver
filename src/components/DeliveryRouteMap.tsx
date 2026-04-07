import * as Location from "expo-location";
import {
  LocateFixed,
  Navigation,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { LatLng, Marker, Polyline } from "react-native-maps";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../constants/design";
import { Card, PrimaryButton, SectionTitle } from "./ui";

export interface DeliveryRouteMapProps {
  destination: { latitude: number; longitude: number };
  destinationTitle?: string;
}

type RouteStatus = "loading" | "ready" | "permission_denied" | "error";

interface RoutePreview {
  coordinates: LatLng[];
  distanceKm: number;
  etaMinutes: number;
  source: "straight-line";
}

const GRAYSCALE_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#efede8" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#595959" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d7d4cd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#e7e5df" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#ece9e2" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#f3f1ec" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#d9d6cf" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c8c4bc" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#e7e4dd" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#dbd8d1" }],
  },
];

const MAP_HEIGHT = 220;
const AVERAGE_SPEED_KMH = 28;

function isValidCoordinate(value: number): boolean {
  return Number.isFinite(value);
}

function buildInitialRegion(destination: LatLng) {
  return {
    latitude: destination.latitude,
    longitude: destination.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(origin: LatLng, destination: LatLng): number {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function buildStraightLineRoute(origin: LatLng, destination: LatLng): RoutePreview {
  const distanceKm = haversineDistanceKm(origin, destination);
  const etaMinutes = Math.max(1, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60));

  // Keep the route object stable so a directions API can replace this later.
  return {
    coordinates: [origin, destination],
    distanceKm,
    etaMinutes,
    source: "straight-line",
  };
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} м`;
  }

  return distanceKm >= 10 ? `${distanceKm.toFixed(1)} км` : `${distanceKm.toFixed(2)} км`;
}

function formatEta(etaMinutes: number): string {
  if (etaMinutes < 60) {
    return `${etaMinutes} мин`;
  }

  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;

  if (minutes === 0) {
    return `${hours} цаг`;
  }

  return `${hours} цаг ${minutes} мин`;
}

function buildGoogleMapsUrl(origin: LatLng | null, destination: LatLng): string {
  const destinationParam = encodeURIComponent(
    `${destination.latitude},${destination.longitude}`,
  );
  const originParam = origin
    ? `&origin=${encodeURIComponent(`${origin.latitude},${origin.longitude}`)}`
    : "";

  return (
    "https://www.google.com/maps/dir/?api=1" +
    `&destination=${destinationParam}` +
    originParam +
    "&travelmode=driving"
  );
}

const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  destination,
  destinationTitle = "Хүргэлтийн цэг",
}) => {
  const mapRef = useRef<MapView | null>(null);
  const isMountedRef = useRef(true);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [status, setStatus] = useState<RouteStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const isDestinationValid = useMemo(
    () =>
      isValidCoordinate(destination.latitude) &&
      isValidCoordinate(destination.longitude),
    [destination.latitude, destination.longitude],
  );

  const loadRoutePreview = useCallback(async () => {
    if (!isDestinationValid) {
      if (!isMountedRef.current) {
        return;
      }
      setStatus("error");
      setErrorMessage("Энэ даалгаврын хүргэх цэгийн координат олдсонгүй.");
      setCurrentLocation(null);
      setRoutePreview(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!isMountedRef.current) {
        return;
      }

      setCanAskAgain(permission.canAskAgain);

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setStatus("permission_denied");
        setCurrentLocation(null);
        setRoutePreview(null);
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      const position =
        lastKnown ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));

      if (!isMountedRef.current) {
        return;
      }

      const origin = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCurrentLocation(origin);
      setRoutePreview(buildStraightLineRoute(origin, destination));
      setStatus("ready");
    } catch (error) {
      console.error("[DeliveryRouteMap] Failed to load route preview:", error);
      if (!isMountedRef.current) {
        return;
      }
      setStatus("error");
      setErrorMessage("Таны одоогийн байршлыг одоогоор авч чадсангүй.");
      setCurrentLocation(null);
      setRoutePreview(null);
    }
  }, [destination, isDestinationValid]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadRoutePreview();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadRoutePreview]);

  useEffect(() => {
    if (!mapReady || !routePreview || !mapRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(routePreview.coordinates, {
        edgePadding: {
          top: 44,
          right: 44,
          bottom: 44,
          left: 44,
        },
        animated: true,
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [mapReady, routePreview]);

  const openGoogleMaps = useCallback(async () => {
    try {
      await Linking.openURL(buildGoogleMapsUrl(currentLocation, destination));
    } catch (error) {
      console.error("[DeliveryRouteMap] Failed to open Google Maps:", error);
      Alert.alert(
        "Google Maps нээж чадсангүй",
        "Түр хүлээгээд дахин оролдоно уу.",
      );
    }
  }, [currentLocation, destination]);

  const handleLocationAction = useCallback(async () => {
    if (canAskAgain) {
      await loadRoutePreview();
      return;
    }

    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("[DeliveryRouteMap] Failed to open settings:", error);
      Alert.alert(
        "Тохиргоо нээж чадсангүй",
        "Төхөөрөмжийн тохиргооноос байршлын хандалтыг идэвхжүүлнэ үү.",
      );
    }
  }, [canAskAgain, loadRoutePreview]);

  const helperText =
    routePreview?.source === "straight-line"
      ? "MVP урьдчилсан харагдац нь шулуун шугам ашиглаж байгаа бөгөөд directions API холбохоор бэлэн."
      : status === "loading"
        ? "Маршрутын урьдчилсан харагдацад таны одоогийн байршлыг авч байна."
        : status === "permission_denied"
          ? "Таны одоогийн байршлаас зай болон хүрэх хугацааг тооцоолохын тулд байршлын хандалтыг зөвшөөрнө үү."
          : errorMessage ?? "Маршрутын урьдчилсан харагдац боломжгүй байна.";

  return (
    <Card variant="elevated" style={styles.card}>
      <SectionTitle title="Хүргэлтийн маршрут" />

      <Text style={styles.destinationLabel}>Хүргэх цэг</Text>
      <Text numberOfLines={2} style={styles.destinationTitle}>
        {destinationTitle}
      </Text>

      {routePreview ? (
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Зай</Text>
            <Text style={styles.metricValue}>
              {formatDistance(routePreview.distanceKm)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ETA</Text>
            <Text style={styles.metricValue}>
              {formatEta(routePreview.etaMinutes)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.fallbackCopy}>
          {status === "loading"
            ? "Маршрутын урьдчилсан харагдац бэлдэж байна..."
            : "Одоогийн байршлаасаа маршрут харахын тулд байршлын хандалтыг зөвшөөрнө үү."}
        </Text>
      )}

      <Text style={styles.helperText}>{helperText}</Text>

      <View style={styles.mapFrame}>
        {isDestinationValid ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            customMapStyle={GRAYSCALE_MAP_STYLE}
            initialRegion={buildInitialRegion(destination)}
            onMapReady={() => setMapReady(true)}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={destination}
              pinColor={Colors.primary}
              title={destinationTitle}
              description="Хүргэлтийн цэг"
            />
            {currentLocation ? (
              <Marker
                coordinate={currentLocation}
                pinColor={Colors.accent}
                title="Курьер"
                description="Таны одоогийн байршил"
              />
            ) : null}
            {routePreview ? (
              <Polyline
                coordinates={routePreview.coordinates}
                geodesic
                strokeColor={Colors.info}
                strokeWidth={4}
              />
            ) : null}
          </MapView>
        ) : null}

        {status === "loading" ? (
          <View style={[styles.overlay, styles.overlayCenter]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.overlayTitle}>Таны байршлыг хайж байна</Text>
            <Text style={styles.overlayText}>
              Маршрутын preview-д зориулж таны одоогийн байршлыг авч байна.
            </Text>
          </View>
        ) : null}

        {status === "permission_denied" ? (
          <View style={[styles.overlay, styles.noticeCard]}>
            <ShieldAlert size={18} color={Colors.warning} strokeWidth={2} />
            <View style={styles.noticeBody}>
              <Text style={styles.noticeTitle}>Байршлын хандалт унтраалттай байна</Text>
              <Text style={styles.noticeText}>
                Курьерын тэмдэглэгээ болон маршрутын шугамыг харахын тулд байршлын хандалтыг асаана уу.
              </Text>
            </View>
          </View>
        ) : null}

        {status === "error" ? (
          <View style={[styles.overlay, styles.noticeCard]}>
            <RefreshCcw size={18} color={Colors.danger} strokeWidth={2} />
            <View style={styles.noticeBody}>
              <Text style={styles.noticeTitle}>Маршрутын урьдчилсан харагдац боломжгүй байна</Text>
              <Text style={styles.noticeText}>
                {errorMessage ?? "Таны одоогийн байршлыг дахин авч үзнэ үү."}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {status === "permission_denied" || status === "error" ? (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            void handleLocationAction();
          }}
          style={styles.secondaryAction}
        >
          <LocateFixed size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.secondaryActionText}>
            {status === "permission_denied"
              ? canAskAgain
                ? "Байршлын хандалт зөвшөөрөх"
                : "Тохиргоо нээх"
              : "Байршлыг дахин шалгах"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <PrimaryButton
        title="Google Maps дээр нээх"
        onPress={() => {
          void openGoogleMaps();
        }}
        icon={<Navigation size={18} color={Colors.white} strokeWidth={2} />}
        style={styles.primaryAction}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
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
  metricRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  fallbackCopy: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  helperText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  mapFrame: {
    height: MAP_HEIGHT,
    borderRadius: Radius.card,
    overflow: "hidden",
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  overlayCenter: {
    backgroundColor: "rgba(247, 246, 243, 0.94)",
    gap: Spacing.xs,
  },
  overlayTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.dark,
  },
  overlayText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 19,
  },
  noticeCard: {
    top: "auto",
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noticeBody: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  noticeTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginBottom: 2,
  },
  noticeText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    lineHeight: 18,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  secondaryActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  primaryAction: {
    marginTop: 0,
  },
});

export default DeliveryRouteMap;
