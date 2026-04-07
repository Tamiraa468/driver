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
  FontWeight,
  Radius,
  Spacing,
} from "../../constants/design";
import Card from "./Card";
import StatusBadge, { StatusType } from "./StatusBadge";

type AmountTone = "default" | "primary" | "success" | "warning" | "danger";

interface ListRow {
  label: string;
  value: string;
  tone?: AmountTone;
}

interface ListItemCardProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  leading?: React.ReactNode;
  amountText?: string;
  amountTone?: AmountTone;
  badgeLabel?: string;
  badgeTone?: StatusType;
  rows?: ListRow[];
  footer?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const amountColorMap: Record<AmountTone, string> = {
  default: Colors.text,
  primary: Colors.primaryDark,
  success: Colors.primaryDark,
  warning: Colors.warning,
  danger: Colors.danger,
};

const ListItemCard: React.FC<ListItemCardProps> = ({
  title,
  subtitle,
  eyebrow,
  leading,
  amountText,
  amountTone = "default",
  badgeLabel,
  badgeTone = "default",
  rows = [],
  footer,
  onPress,
  style,
}) => {
  const content = (
    <Card style={style} variant="elevated">
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <View style={styles.headerRow}>
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            <View style={styles.headerText}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              {subtitle ? (
                <Text numberOfLines={2} style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {amountText ? (
          <Text
            style={[styles.amount, { color: amountColorMap[amountTone] }]}
          >
            {amountText}
          </Text>
        ) : null}
      </View>

      {badgeLabel ? (
        <View style={styles.badgeRow}>
          <StatusBadge label={badgeLabel} status={badgeTone} />
        </View>
      ) : null}

      {rows.length > 0 ? (
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={`${row.label}-${row.value}`} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.rowValue,
                  { color: amountColorMap[row.tone ?? "default"] },
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  leading: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 2,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: 21,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
  },
  amount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginLeft: Spacing.sm,
  },
  badgeRow: {
    marginTop: Spacing.sm + 2,
  },
  rows: {
    marginTop: Spacing.md,
    gap: Spacing.xs + 2,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  rowLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    flex: 1,
    textAlign: "right",
  },
  footer: {
    marginTop: Spacing.md,
  },
});

export default ListItemCard;
