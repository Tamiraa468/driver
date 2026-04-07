import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from "../../constants/design";

export type StatusType = "success" | "warning" | "danger" | "info" | "default";

interface StatusBadgeProps {
  label: string;
  status?: StatusType;
  className?: string;
}

const badgeConfig: Record<
  StatusType,
  {
    backgroundColor: string;
    textColor: string;
    dotColor: string;
    borderColor: string;
  }
> = {
  success: {
    backgroundColor: Colors.successSoft,
    textColor: Colors.primaryDark,
    dotColor: Colors.success,
    borderColor: Colors.primarySoftStrong,
  },
  warning: {
    backgroundColor: Colors.warningSoft,
    textColor: Colors.warning,
    dotColor: Colors.warning,
    borderColor: Colors.border,
  },
  danger: {
    backgroundColor: Colors.dangerSoft,
    textColor: Colors.danger,
    dotColor: Colors.danger,
    borderColor: Colors.borderStrong,
  },
  info: {
    backgroundColor: Colors.infoSoft,
    textColor: Colors.info,
    dotColor: Colors.info,
    borderColor: "#C8D5FF",
  },
  default: {
    backgroundColor: Colors.surfaceAlt,
    textColor: Colors.textSoft,
    dotColor: Colors.mutedLight,
    borderColor: Colors.border,
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  status = "default",
  className = "",
}) => {
  const config = badgeConfig[status];

  return (
    <View
      className={className}
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      <Text style={[styles.text, { color: config.textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    marginRight: Spacing.xs + 2,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.25,
  },
});

export default StatusBadge;
