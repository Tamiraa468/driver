import "./global.css";

import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colors } from "./src/constants/design";
import { CourierAuthProvider } from "./src/context";
import { CourierRootNavigator } from "./src/navigation";
import { installTelemetry } from "./src/telemetry";

// Install RPC telemetry before any Supabase call. Env-gated so production
// builds can disable it by setting EXPO_PUBLIC_TELEMETRY=off.
if (process.env.EXPO_PUBLIC_TELEMETRY !== "off") {
  installTelemetry();
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <CourierAuthProvider statusRefreshInterval={30000}>
          <CourierRootNavigator />
          <StatusBar style="dark" />
        </CourierAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
