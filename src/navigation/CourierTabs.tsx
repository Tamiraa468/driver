import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, Text } from "react-native";

import {
  AvailableTasksScreen,
  EarningsScreen,
  HomeScreen,
  OrdersScreen,
  ProfileScreen,
} from "../screens/courier";

export type CourierTabParamList = {
  Available: undefined;
  Home: undefined;
  Orders: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CourierTabParamList>();

const CourierTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#28a745",
        tabBarInactiveTintColor: "#8e8e93",
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Available"
        component={AvailableTasksScreen}
        options={{
          tabBarLabel: "Available",
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🎯</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📦</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarLabel: "Earnings",
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>💰</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingBottom: 8,
    paddingTop: 8,
    height: 70,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  tabIcon: {
    fontSize: 24,
  },
});

export default CourierTabs;
