import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { House, Package, ShoppingBag, User } from "lucide-react-native";

import { Colors } from "../constants/design";
import {
  HomeScreen,
  ShopDetailScreen,
  CartScreen,
  OrdersScreen,
  ProfileScreen,
} from "../screens/customer";
import { Shop } from "../types";

// Stack types
export type CustomerHomeStackParamList = {
  HomeMain: undefined;
  ShopDetail: { shop: Shop };
  Cart: undefined;
};

// Create Stack Navigator for Home
const HomeStack = createNativeStackNavigator<CustomerHomeStackParamList>();

const HomeStackNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="ShopDetail" component={ShopDetailScreen} />
      <HomeStack.Screen name="Cart" component={CartScreen} />
    </HomeStack.Navigator>
  );
};

// Tab types
export type CustomerTabParamList = {
  Home: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const CustomerTabs: React.FC = () => {
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
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: "Нүүр",
          tabBarIcon: ({ color }) => (
            <House size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: "Сагс",
          tabBarIcon: ({ color }) => (
            <ShoppingBag size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Захиалга",
          tabBarIcon: ({ color }) => (
            <Package size={20} color={color} strokeWidth={2} />
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

export default CustomerTabs;
