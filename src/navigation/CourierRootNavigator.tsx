import {
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, StateView } from "../components/ui";
import { Colors, Layout } from "../constants/design";
import { useCourierAuth } from "../context/CourierAuthContext";
import {
  BlockedAccountScreen,
  KYCRequiredScreen,
  PendingApprovalScreen,
} from "../screens/auth";
import { ActiveTrackingScreen, DeliveryDetailsScreen, EPODVerificationScreen } from "../screens/courier";
import RpcDebugScreen from "../screens/dev/RpcDebugScreen";
import CourierAuthStack from "./CourierAuthStack";
import CourierTabs from "./CourierTabs";

export type CourierRootStackParamList = {
  Auth: undefined;
  KYCRequired: undefined;
  PendingApproval: undefined;
  BlockedAccount: undefined;
  CourierMain: undefined;
  DeliveryDetails: { taskId?: string };
  ActiveTracking: { taskId: string };
  EPODVerification: { taskId: string };
  RpcDebug: undefined;
};

const Stack = createNativeStackNavigator<CourierRootStackParamList>();

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

const CourierRootNavigator: React.FC = () => {
  const {
    isLoading,
    isAuthenticated,
    isApproved,
    isKycRequired,
    isKycSubmitted,
    isBlocked,
  } = useCourierAuth();

  const blurActiveElementOnWeb = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingSafe}>
        <View style={styles.loadingWrap}>
          <ScreenHeader
            title="Курьер апп"
            subtitle="Таны курьерын орчныг бэлтгэж байна"
          />
          <StateView
            loading
            title="Ачааллаж байна..."
            description="Таны бүртгэл болон хандалтын төлөвийг шалгаж байна."
          />
        </View>
      </SafeAreaView>
    );
  }

  const getInitialRouteName = (): keyof CourierRootStackParamList => {
    if (!isAuthenticated) {
      return "Auth";
    }

    if (isBlocked) {
      return "BlockedAccount";
    }

    if (isKycRequired) {
      return "KYCRequired";
    }

    if (isKycSubmitted) {
      return "PendingApproval";
    }

    if (isApproved) {
      return "CourierMain";
    }

    return "Auth";
  };

  return (
    <NavigationContainer
      onStateChange={blurActiveElementOnWeb}
      theme={navigationTheme}
    >
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
        {!isAuthenticated && (
          <Stack.Screen name="Auth" component={CourierAuthStack} />
        )}

        {isAuthenticated && (
          <>
            {isBlocked && (
              <Stack.Screen
                name="BlockedAccount"
                component={BlockedAccountScreen}
              />
            )}

            {isKycRequired && (
              <Stack.Screen name="KYCRequired" component={KYCRequiredScreen} />
            )}

            {isKycSubmitted && (
              <Stack.Screen
                name="PendingApproval"
                component={PendingApprovalScreen}
              />
            )}

            {isApproved && (
              <>
                <Stack.Screen name="CourierMain" component={CourierTabs} />
                <Stack.Screen
                  name="DeliveryDetails"
                  component={DeliveryDetailsScreen}
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="ActiveTracking"
                  component={ActiveTrackingScreen}
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="EPODVerification"
                  component={EPODVerificationScreen}
                  options={{ animation: "slide_from_right" }}
                />
                {__DEV__ && (
                  <Stack.Screen
                    name="RpcDebug"
                    component={RpcDebugScreen}
                    options={{
                      animation: "slide_from_bottom",
                      presentation: "modal",
                    }}
                  />
                )}
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
  },
});

export default CourierRootNavigator;
