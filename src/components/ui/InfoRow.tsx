/**
 * InfoRow Component
 *
 * Horizontal row for displaying label-value pairs.
 */

import React, { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, FontSize, Spacing } from "../../constants/design";

interface InfoRowProps {
  label: string;
  value: string;
  icon?: string;
  rightElement?: ReactNode;
  onPress?: () => void;
  className?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  icon,
  rightElement,
  onPress,
  className = "",
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`flex-row items-center justify-between py-3 ${className}`}
      style={styles.row}
    >
      <View className="flex-row items-center flex-1">
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <View className="flex-1">
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      {rightElement && rightElement}
      {onPress && !rightElement && <Text style={styles.chevron}>›</Text>}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.sm + 4,
  },
  icon: {
    fontSize: 20,
    marginRight: Spacing.sm + 4,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.base,
    fontWeight: "500",
    color: Colors.text,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: "300",
  },
});

export default InfoRow;
