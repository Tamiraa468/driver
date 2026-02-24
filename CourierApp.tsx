/**
 * Courier App Entry Point
 *
 * Example usage of the CourierAuthProvider and CourierRootNavigator
 * for the courier mobile application.
 *
 * This file demonstrates the production setup for courier authentication.
 */

import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { CourierAuthProvider } from "./src/context/CourierAuthContext";
import { CourierRootNavigator } from "./src/navigation";

/**
 * Main App Component
 *
 * Wraps the entire app with:
 * 1. GestureHandlerRootView - Required for React Navigation
 * 2. CourierAuthProvider - Handles authentication state
 * 3. CourierRootNavigator - Handles navigation based on auth state
 */
export default function CourierApp() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      <CourierAuthProvider
        // Refresh status every 30 seconds when pending
        // This checks if admin has approved the courier
        statusRefreshInterval={30000}
      >
        <CourierRootNavigator />
      </CourierAuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**
 * USAGE NOTES:
 *
 * 1. SUPABASE SETUP:
 *    - Run the SQL migrations from supabase/migrations/001_courier_auth_schema.sql
 *    - Configure your Supabase URL and anon key in src/config/supabaseClient.ts
 *
 * 2. AUTHENTICATION FLOW:
 *    - User signs up → role='courier', status='pending'
 *    - User sees PendingApprovalScreen until admin approves
 *    - Admin updates profiles.status = 'approved'
 *    - App auto-refreshes and navigates to CourierTabs
 *
 * 3. USING AUTH IN COMPONENTS:
 *
 *    import { useCourierAuth } from "./src/context/CourierAuthContext";
 *
 *    const MyComponent = () => {
 *      const {
 *        user,           // Current user profile
 *        isAuthenticated, // Boolean: logged in
 *        isApproved,     // Boolean: can access delivery tasks
 *        isPending,      // Boolean: waiting for approval
 *        isBlocked,      // Boolean: account suspended
 *        signIn,         // Function: login
 *        signUp,         // Function: register
 *        signOut,        // Function: logout
 *        refreshStatus,  // Function: check for status updates
 *        updateProfile,  // Function: update name/phone
 *      } = useCourierAuth();
 *
 *      // ...
 *    };
 *
 * 4. PROTECTING DELIVERY SCREENS:
 *
 *    import { useDeliveryAccess } from "./src/context/CourierAuthContext";
 *
 *    const DeliveryTasksScreen = () => {
 *      const hasAccess = useDeliveryAccess();
 *
 *      if (!hasAccess) {
 *        return <Text>You don't have access to delivery tasks</Text>;
 *      }
 *
 *      return <DeliveryTasksList />;
 *    };
 *
 * 5. RLS POLICIES:
 *    The SQL migrations set up RLS policies that:
 *    - Couriers can only read their own profile
 *    - Couriers can only update full_name and phone
 *    - Couriers can only see published tasks when approved
 *    - Couriers can claim tasks by setting status='assigned'
 */
