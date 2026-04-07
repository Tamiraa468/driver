import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import {
  Colors,
  FontSize,
  FontWeight,
  Layout,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/design";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "success"
  | "ghost";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  className = "",
  style,
  icon,
}) => {
  const isDisabled = disabled || loading;

  const backgrounds: Record<ButtonVariant, string> = {
    primary: Colors.accent,
    secondary: Colors.primarySoft,
    outline: Colors.surface,
    danger: Colors.danger,
    success: Colors.primary,
    ghost: "transparent",
  };

  const borders: Record<ButtonVariant, string> = {
    primary: Colors.accent,
    secondary: Colors.primarySoftStrong,
    outline: Colors.borderStrong,
    danger: Colors.danger,
    success: Colors.primary,
    ghost: "transparent",
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: Colors.white,
    secondary: Colors.primaryDark,
    outline: Colors.text,
    danger: Colors.white,
    success: Colors.white,
    ghost: Colors.primaryDark,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      className={className}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: backgrounds[variant],
          borderColor: borders[variant],
          opacity: isDisabled ? 0.58 : 1,
        },
        variant === "primary" || variant === "success" ? Shadow.button : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: textColors[variant],
                marginLeft: icon ? Spacing.xs + 2 : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: Layout.buttonHeight,
    borderRadius: Radius.button,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  text: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.1,
  },
});

export default PrimaryButton;
