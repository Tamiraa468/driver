/**
 * Courier Authentication Stack Navigator
 *
 * Handles navigation between authentication screens for couriers.
 * Includes Welcome, Login, and Register screens.
 */

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Platform } from "react-native";
import {
  CourierLoginScreen,
  CourierRegisterScreen,
  CourierWelcomeScreen,
} from "../screens/auth";

export type CourierAuthStackParamList = {
  Welcome: undefined;
  CourierLogin: undefined;
  CourierRegister: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<CourierAuthStackParamList>();

const CourierAuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "web" ? "none" : "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={CourierWelcomeScreen} />
      <Stack.Screen name="CourierLogin" component={CourierLoginScreen} />
      <Stack.Screen name="CourierRegister" component={CourierRegisterScreen} />
      {/* TODO: Add ForgotPasswordScreen when implemented */}
    </Stack.Navigator>
  );
};

export default CourierAuthStack;
