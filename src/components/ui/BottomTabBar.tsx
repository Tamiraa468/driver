/**
 * BottomTabBar Component
 *
 * Custom bottom tab navigation bar with outline icons.
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, FontSize, Shadow } from "../../constants/design";

interface TabItem {
  key: string;
  label: string;
  icon: string;
  activeIcon: string;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  return (
    <View
      className="flex-row bg-white border-t border-gray-100 px-2 pb-6 pt-2"
      style={styles.container}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
            className="flex-1 items-center justify-center py-2"
            style={styles.tab}
          >
            <Text style={styles.icon}>
              {isActive ? tab.activeIcon : tab.icon}
            </Text>
            <Text
              style={[
                styles.label,
                { color: isActive ? Colors.text : Colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.float,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
  },
  tab: {
    minHeight: 48,
  },
  icon: {
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "500",
  },
});

export default BottomTabBar;
