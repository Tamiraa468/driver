import React, { ReactNode } from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  Colors,
  Layout,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/design";

type CardVariant = "default" | "elevated" | "outline" | "subtle";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  padding?: CardPadding;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  elevated: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  outline: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  subtle: {
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
};

const paddingStyles: Record<CardPadding, ViewStyle> = {
  none: {
    padding: 0,
  },
  sm: {
    padding: Spacing.md,
  },
  md: {
    padding: Layout.cardPadding,
  },
  lg: {
    padding: Spacing.lg,
  },
};

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  style,
  variant = "default",
  padding = "md",
}) => {
  return (
    <View
      className={className}
      style={[
        styles.base,
        variantStyles[variant],
        paddingStyles[padding],
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.card,
  },
});

export default Card;
