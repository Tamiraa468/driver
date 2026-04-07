import { Platform } from "react-native";

/**
 * Design System Tokens
 *
 * Shared visual language for the courier app.
 * Inspired by Uber-style dark utility surfaces with controlled green accents.
 */

export const Colors = {
  primary: "#28A86B",
  primaryDark: "#1E7D50",
  primaryPressed: "#17613D",
  primarySoft: "#E8F7EE",
  primarySoftStrong: "#CDEEDB",
  accent: "#0E0E0E",
  accentSoft: "#F5F3EE",
  white: "#FFFFFF",
  black: "#050505",
  dark: "#111111",
  text: "#161616",
  textSoft: "#565656",
  textMuted: "#7A7A7A",
  muted: "#666666",
  mutedLight: "#A6A6A6",
  background: "#F6F4EE",
  backgroundMuted: "#ECE7DD",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F0EA",
  cardBg: "#FFFFFF",
  border: "#E3DED3",
  borderStrong: "#D0C8B8",
  overlay: "rgba(40, 168, 107, 0.14)",
  shadow: "#000000",
  success: "#28A86B",
  successSoft: "#E8F7EE",
  warning: "#B7791F",
  warningSoft: "#FFF3E1",
  danger: "#D05C4F",
  dangerSoft: "#FCECEA",
  info: "#4A7CFF",
  infoSoft: "#EBF1FF",
  navyStart: "#111111",
  navyEnd: "#1A2B22",
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  screen: 24,
  section: 28,
  card: 20,
} as const;

export const Radius = {
  xs: 10,
  sm: 14,
  md: 18,
  card: 24,
  button: 18,
  input: 18,
  lg: 28,
  full: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const Fonts = {
  display:
    Platform.select({
      ios: "System",
      android: "sans-serif-medium",
      default: "system-ui",
    }) ?? "System",
} as const;

export const Typography = {
  screenTitle: {
    fontSize: FontSize["3xl"],
    fontFamily: Fonts.display,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: 24,
  },
  body: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    color: Colors.text,
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: 22,
  },
  caption: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  micro: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    lineHeight: 16,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.screen,
  sectionGap: Spacing.section,
  cardPadding: Spacing.card,
  buttonHeight: 54,
  inputHeight: 56,
  tabHeight: 44,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
} as const;

export const Shadow = {
  card: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  button: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  float: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export const StatusColors = {
  delivered: Colors.success,
  pending: Colors.warning,
  onDelivery: Colors.primary,
  problem: Colors.danger,
} as const;
