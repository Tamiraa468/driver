import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from "../../constants/design";

interface SectionTitleProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  actionLabel,
  onActionPress,
  className = "",
}) => {
  return (
    <View className={className} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity activeOpacity={0.75} onPress={onActionPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm + 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: 24,
  },
  action: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
});

export default SectionTitle;
