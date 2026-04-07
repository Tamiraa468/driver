import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import {
  Colors,
  FontSize,
  Fonts,
  FontWeight,
  Radius,
  Spacing,
} from "../../constants/design";
import Card from "./Card";

type SummaryTone = "primary" | "success" | "warning" | "neutral";

type LucideIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: SummaryTone;
  style?: StyleProp<ViewStyle>;
}

const toneConfig: Record<
  SummaryTone,
  { iconBg: string; iconColor: string; valueColor: string }
> = {
  primary: {
    iconBg: Colors.primarySoft,
    iconColor: Colors.primaryDark,
    valueColor: Colors.accent,
  },
  success: {
    iconBg: Colors.successSoft,
    iconColor: Colors.primaryDark,
    valueColor: Colors.primaryDark,
  },
  warning: {
    iconBg: Colors.warningSoft,
    iconColor: Colors.warning,
    valueColor: Colors.accent,
  },
  neutral: {
    iconBg: Colors.surfaceAlt,
    iconColor: Colors.textSoft,
    valueColor: Colors.accent,
  },
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  style,
}) => {
  const config = toneConfig[tone];

  return (
    <Card style={style} variant="elevated">
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: config.iconBg }]}>
            <Icon size={18} color={config.iconColor} strokeWidth={2} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, { color: config.valueColor }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSoft,
    flex: 1,
    lineHeight: 20,
  },
  value: {
    fontSize: FontSize["2xl"],
    fontFamily: Fonts.display,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs + 2,
    lineHeight: 30,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
});

export default SummaryCard;
