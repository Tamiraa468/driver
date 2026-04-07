import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DollarSign, Home, Package, User } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
} from "../constants/design";
import { AvailableTasksScreen, EarningsScreen, HomeScreen, ProfileScreen } from "../screens/courier";

export type CourierTabParamList = {
  Home: undefined;
  AvailableTasks: undefined;
  Active: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CourierTabParamList>();

const CourierTabs: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: Colors.background,
        },
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom:
            Platform.OS === "ios" ? 22 : Math.max(insets.bottom, 8) + 8,
          height: Platform.OS === "ios" ? 86 : 64 + Math.max(insets.bottom, 0),
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarActiveBackgroundColor: Colors.primarySoft,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Нүүр",
          tabBarIcon: ({ color }) => (
            <Home size={20} color={color} strokeWidth={2.1} />
          ),
        }}
      />
      <Tab.Screen
        name="AvailableTasks"
        component={AvailableTasksScreen}
        options={{
          tabBarLabel: "Хүргэлт",
          tabBarIcon: ({ color }) => (
            <Package size={20} color={color} strokeWidth={2.1} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarLabel: "Орлого",
          tabBarIcon: ({ color }) => (
            <DollarSign size={20} color={color} strokeWidth={2.1} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Профайл",
          tabBarIcon: ({ color }) => (
            <User size={20} color={color} strokeWidth={2.1} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    ...Shadow.float,
  },
  tabBarLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginTop: 3,
  },
  tabBarItem: {
    borderRadius: Radius.md,
    marginHorizontal: 6,
    marginVertical: 4,
  },
});

export default CourierTabs;
