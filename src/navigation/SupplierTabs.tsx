import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Box, ClipboardList, LayoutDashboard, User } from "lucide-react-native";

import { Colors } from "../constants/design";
import {
  DashboardScreen,
  ProductsScreen,
  OrdersScreen,
  ProfileScreen,
} from "../screens/supplier";

export type SupplierTabParamList = {
  Dashboard: undefined;
  Products: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<SupplierTabParamList>();

const SupplierTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Самбар",
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarLabel: "Бүтээгдэхүүн",
          tabBarIcon: ({ color }) => (
            <Box size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Захиалга",
          tabBarIcon: ({ color }) => (
            <ClipboardList size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Профайл",
          tabBarIcon: ({ color }) => (
            <User size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default SupplierTabs;
