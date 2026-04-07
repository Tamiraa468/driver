import React from "react";
import {
  ScrollView,
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
  Layout,
  Radius,
  Spacing,
} from "../../constants/design";

export interface FilterTabOption {
  key: string;
  label: string;
}

interface FilterTabsProps {
  options: FilterTabOption[];
  value: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  options,
  value,
  onChange,
  style,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={style}
    >
      <View style={styles.track}>
        {options.map((option) => {
          const active = option.key === value;

          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.8}
              onPress={() => onChange(option.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primarySoftStrong,
    gap: Spacing.xs,
  },
  tab: {
    minHeight: Layout.tabHeight,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSoft,
  },
  labelActive: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
  },
});

export default FilterTabs;
