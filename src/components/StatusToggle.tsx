import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Colors, FontSize, Radius, Spacing } from "../constants/design";

interface StatusToggleProps {
  isOnline: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
}

const StatusToggle: React.FC<StatusToggleProps> = ({
  isOnline,
  onToggle,
  label = "Төлөв",
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isOnline
                ? Colors.primary
                : Colors.surfaceAlt,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isOnline ? styles.statusTextActive : null,
            ]}
          >
            {isOnline ? "Онлайн" : "Оффлайн"}
          </Text>
        </View>
      </View>
      <Switch
        value={isOnline}
        onValueChange={onToggle}
        trackColor={{ false: Colors.borderStrong, true: Colors.primarySoftStrong }}
        thumbColor={isOnline ? Colors.primary : Colors.white}
        style={styles.switch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.card,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  statusTextActive: {
    color: Colors.white,
  },
  switch: {
    marginLeft: 16,
  },
});

export default StatusToggle;
