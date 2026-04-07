import { ArrowLeft } from "lucide-react-native";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import {
  Colors,
  FontSize,
  Fonts,
  FontWeight,
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBackPress,
  right,
  style,
}) => {
  const hasTopRow = Boolean(onBackPress || right);

  return (
    <View style={[styles.container, style]}>
      {hasTopRow ? (
        <View style={styles.topRow}>
          {onBackPress ? (
            <TouchableOpacity
              activeOpacity={0.76}
              onPress={onBackPress}
              style={styles.backButton}
            >
              <ArrowLeft size={18} color={Colors.text} strokeWidth={2.1} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
          {right ? <View style={styles.rightSlot}>{right}</View> : <View style={styles.placeholder} />}
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  topRow: {
    minHeight: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  rightSlot: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 40,
  },
  title: {
    fontSize: FontSize["3xl"],
    fontFamily: Fonts.display,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: Spacing.xs + 4,
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 22,
  },
});

export default ScreenHeader;
