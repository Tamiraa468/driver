/**
 * Courier Root Navigator
 *
 * Main navigation component for the courier app.
 * Handles routing based on authentication and approval status.
 *
 * Navigation flow:
 * 1. Not authenticated → Auth screens (login/register)
 * 2. Authenticated + Pending → Pending Approval screen
 * 3. Authenticated + Blocked → Blocked Account screen
 * 4. Authenticated + Approved → Main courier tabs
 */

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";

import { useCourierAuth } from "../context/CourierAuthContext";
import { BlockedAccountScreen, PendingApprovalScreen } from "../screens/auth";
import CourierAuthStack from "./CourierAuthStack";
import CourierTabs from "./CourierTabs";

export type CourierRootStackParamList = {
  Auth: undefined;
  PendingApproval: undefined;
  BlockedAccount: undefined;
  CourierMain: undefined;
};

const Stack = createNativeStackNavigator<CourierRootStackParamList>();

const CourierRootNavigator: React.FC = () => {
  const { isLoading, isAuthenticated, isApproved, isPending, isBlocked } =
    useCourierAuth();

  const blurActiveElementOnWeb = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Ачаалж байна...</Text>
      </View>
    );
  }

  // Determine initial route based on auth and approval status
  const getInitialRouteName = (): keyof CourierRootStackParamList => {
    if (!isAuthenticated) {
      return "Auth";
    }

    if (isBlocked) {
      return "BlockedAccount";
    }

    if (isPending) {
      return "PendingApproval";
    }

    if (isApproved) {
      return "CourierMain";
    }

    // Fallback to auth
    return "Auth";
  };

  return (
    <NavigationContainer onStateChange={blurActiveElementOnWeb}>
      <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "web" ? "none" : "fade",
        }}
      >
        {/* Not Authenticated */}
        {!isAuthenticated && (
          <Stack.Screen name="Auth" component={CourierAuthStack} />
        )}

        {/* Authenticated but status checks */}
        {isAuthenticated && (
          <>
            {/* Blocked Account */}
            {isBlocked && (
              <Stack.Screen
                name="BlockedAccount"
                component={BlockedAccountScreen}
              />
            )}

            {/* Pending Approval */}
            {isPending && (
              <Stack.Screen
                name="PendingApproval"
                component={PendingApprovalScreen}
              />
            )}

            {/* Approved - Full Access */}
            {isApproved && (
              <Stack.Screen name="CourierMain" component={CourierTabs} />
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
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
});

export default CourierRootNavigator;
