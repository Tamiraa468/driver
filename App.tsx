import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CourierAuthProvider } from "./src/context";
import { CourierRootNavigator } from "./src/navigation";

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
  },
});
