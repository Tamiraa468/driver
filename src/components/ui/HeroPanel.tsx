import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import {
  Colors,
  FontSize,
  Fonts,
  FontWeight,
  Radius,
  Spacing,
} from "../../constants/design";
import Card from "./Card";
import StatusBadge, { StatusType } from "./StatusBadge";

interface HeroMetric {
  label: string;
  value: string;
}

interface HeroPanelProps {
  title: string;
  description?: string;
  eyebrow?: string;
  badgeLabel?: string;
  badgeTone?: StatusType;
  icon?: React.ReactNode;
  accessory?: React.ReactNode;
  metrics?: HeroMetric[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HeroPanel: React.FC<HeroPanelProps> = ({
  title,
  description,
  eyebrow,
  badgeLabel,
  badgeTone = "info",
  icon,
  accessory,
  metrics = [],
  children,
  footer,
  style,
}) => {
  return (
    <Card padding="lg" style={[styles.card, style]} variant="elevated">
      <LinearGradient
        colors={[Colors.surface, Colors.accentSoft, Colors.primarySoft]}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={styles.gradient}
      />
      <View pointerEvents="none" style={styles.topBand} />
      <View pointerEvents="none" style={styles.glowLarge} />
      <View pointerEvents="none" style={styles.glowSmall} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.textWrap}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
          </View>

          {accessory ? (
            <View style={styles.accessorySlot}>{accessory}</View>
          ) : icon ? (
            <View style={styles.iconWrap}>{icon}</View>
          ) : null}
        </View>

        {badgeLabel ? (
          <View style={styles.badgeRow}>
            <StatusBadge label={badgeLabel} status={badgeTone} />
          </View>
        ) : null}

        {metrics.length > 0 ? (
          <View style={styles.metricsRow}>
            {metrics.map((metric) => (
              <View
                key={`${metric.label}-${metric.value}`}
                style={styles.metricCard}
              >
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {children ? <View style={styles.body}>{children}</View> : null}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: Colors.primary,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
  glowLarge: {
    position: "absolute",
    top: -54,
    right: -28,
    width: 184,
    height: 184,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoftStrong,
    opacity: 0.8,
  },
  glowSmall: {
    position: "absolute",
    bottom: -42,
    left: -18,
    width: 144,
    height: 144,
    borderRadius: Radius.full,
    backgroundColor: Colors.infoSoft,
    opacity: 0.72,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  eyebrow: {
    marginBottom: Spacing.xs + 2,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  title: {
    fontSize: FontSize["3xl"],
    fontFamily: Fonts.display,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  description: {
    marginTop: Spacing.xs + 4,
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 22,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
  },
  accessorySlot: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  badgeRow: {
    marginTop: Spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  metricCard: {
    minWidth: 92,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
  },
  metricValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
  },
  body: {
    marginTop: Spacing.md,
  },
  footer: {
    marginTop: Spacing.md,
  },
});

export default HeroPanel;
