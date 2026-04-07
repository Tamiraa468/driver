import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Colors } from "../constants/design";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import CustomerTabs from "./CustomerTabs";
import CourierTabs from "./CourierTabs";
import SupplierTabs from "./SupplierTabs";

export type RootStackParamList = {
  Auth: undefined;
  CustomerMain: undefined;
  CourierMain: undefined;
  SupplierMain: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.text,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.text,
  },
};

const RootNavigator: React.FC = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.text} />
        <Text style={styles.loadingText}>Ачаалж байна...</Text>
      </View>
    );
  }

  const getInitialRouteName = (): keyof RootStackParamList => {
    if (!isAuthenticated || !user) {
      return "Auth";
    }

    switch (user.role) {
      case "customer":
        return "CustomerMain";
      case "courier":
        return "CourierMain";
      case "supplier":
        return "SupplierMain";
      default:
        return "Auth";
    }
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "web" ? "none" : "fade",
          contentStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            {user?.role === "customer" && (
              <Stack.Screen name="CustomerMain" component={CustomerTabs} />
            )}
            {user?.role === "courier" && (
              <Stack.Screen name="CourierMain" component={CourierTabs} />
            )}
            {user?.role === "supplier" && (
              <Stack.Screen name="SupplierMain" component={SupplierTabs} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSoft,
  },
});

export default RootNavigator;
