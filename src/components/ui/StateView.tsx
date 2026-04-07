import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
} from "../../constants/design";
import Card from "./Card";
import PrimaryButton from "./PrimaryButton";

interface StateViewProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const StateView: React.FC<StateViewProps> = ({
  icon,
  title,
  description,
  loading = false,
  actionLabel,
  onActionPress,
  style,
}) => {
  return (
    <Card style={style} variant="subtle">
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="large" />
        ) : icon ? (
          icon
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {actionLabel && onActionPress ? (
          <PrimaryButton
            title={actionLabel}
            onPress={onActionPress}
            style={styles.button}
            variant="primary"
          />
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },
  title: {
    marginTop: Spacing.md,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: "center",
  },
  description: {
    marginTop: Spacing.xs + 2,
    fontSize: FontSize.sm,
    color: Colors.textSoft,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    marginTop: Spacing.md,
    minWidth: 150,
  },
});

export default StateView;
