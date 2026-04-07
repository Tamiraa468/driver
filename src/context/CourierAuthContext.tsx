/**
 * Courier Authentication Context
 *
 * React Context for managing courier authentication state throughout the app.
 * Provides secure sign up, sign in, sign out, and access control functionality.
 *
 * Usage:
 * 1. Wrap your app with <CourierAuthProvider>
 * 2. Use useCourierAuth() hook in components
 *
 * Features:
 * - Automatic session restoration on app launch
 * - Access status tracking (pending/approved/blocked)
 * - Periodic refresh for status updates
 * - Type-safe authentication state
 */

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as courierAuthService from "../services/courierAuthService";
import {
  AuthError,
  CourierAccessStatus,
  KYCSubmitData,
  ProfileUpdateData,
  SignInData,
  SignUpData,
  UserProfile,
} from "../types";

// ============================================================================
// TYPES
// ============================================================================

interface CourierAuthContextType {
  // State
  user: UserProfile | null;
  accessStatus: CourierAccessStatus | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isPending: boolean;
  isKycRequired: boolean;
  isKycSubmitted: boolean;
  isBlocked: boolean;
  error: AuthError | null;

  // Actions
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  submitKYC: (data: KYCSubmitData) => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const CourierAuthContext = createContext<CourierAuthContextType | undefined>(
  undefined,
);

// ============================================================================
// PROVIDER
// ============================================================================

interface CourierAuthProviderProps {
  children: ReactNode;
  // Optional: Interval for automatic status refresh (ms)
  // Set to 0 to disable
  statusRefreshInterval?: number;
}

export const CourierAuthProvider: React.FC<CourierAuthProviderProps> = ({
  children,
  statusRefreshInterval = 60000, // Default: 1 minute
}) => {
  // State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessStatus, setAccessStatus] = useState<CourierAccessStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Guard flag to prevent onAuthStateChange from conflicting with explicit actions
  const isActionInProgress = useRef(false);

  // Derived state
  const isAuthenticated = !!user;
  const isApproved = accessStatus?.isApproved ?? false;
  const isPending =
    accessStatus?.status === "pending" ||
    accessStatus?.status === "kyc_submitted";
  const isKycRequired = accessStatus?.status === "pending";
  const isKycSubmitted = accessStatus?.status === "kyc_submitted";
  const isBlocked = accessStatus?.status === "blocked";

  // ============================================================================
  // SESSION RESTORATION
  // ============================================================================

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await courierAuthService.restoreSession();

      if (result) {
        setUser(result.user);
        setAccessStatus(result.accessStatus);
      } else {
        setUser(null);
        setAccessStatus(null);
      }
    } catch (err) {
      console.error("Session restore error:", err);
      setUser(null);
      setAccessStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // PERIODIC STATUS REFRESH
  // For checking if status changed (pending → approved)
  // ============================================================================

  useEffect(() => {
    if (!user || !isAuthenticated || statusRefreshInterval === 0) {
      return;
    }

    // Only refresh if status is pending (waiting for approval)
    if (accessStatus?.status !== "pending") {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await courierAuthService.refreshProfile();
        if (result) {
          setUser(result.user);
          setAccessStatus(result.accessStatus);

          // If status changed from pending, stop checking
          if (result.accessStatus.status !== "pending") {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error("Status refresh error:", err);
      }
    }, statusRefreshInterval);

    return () => clearInterval(intervalId);
  }, [user, isAuthenticated, statusRefreshInterval, accessStatus?.status]);

  // ============================================================================
  // AUTH STATE LISTENER
  // ============================================================================

  useEffect(() => {
    const unsubscribe = courierAuthService.onAuthStateChange(
      async (event, profile) => {
        // Skip INITIAL_SESSION — handled by restoreSession on mount
        if (event === "INITIAL_SESSION") return;

        // Skip events triggered by our own signIn/signUp/signOut actions
        if (isActionInProgress.current) return;

        if (event === "SIGNED_OUT" || !profile) {
          setUser(null);
          setAccessStatus(null);
        } else if (profile) {
          setUser(profile);
          const status = await courierAuthService.checkCourierAccess();
          setAccessStatus(status);
        }
      },
    );

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const signUp = useCallback(async (data: SignUpData) => {
    try {
      isActionInProgress.current = true;
      setIsLoading(true);
      setError(null);

      const result = await courierAuthService.signUpCourier(data);

      setUser(result.user);
      setAccessStatus(result.accessStatus);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      throw err;
    } finally {
      setIsLoading(false);
      isActionInProgress.current = false;
    }
  }, []);

  const signIn = useCallback(async (data: SignInData) => {
    try {
      isActionInProgress.current = true;
      setIsLoading(true);
      setError(null);

      const result = await courierAuthService.signInCourier(data);

      setUser(result.user);
      setAccessStatus(result.accessStatus);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      throw err;
    } finally {
      setIsLoading(false);
      isActionInProgress.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      isActionInProgress.current = true;
      setIsLoading(true);
      setError(null);

      await courierAuthService.signOutCourier();

      setUser(null);
      setAccessStatus(null);
    } catch (err) {
      console.error("Sign out error:", err);
      // Still clear state on error
      setUser(null);
      setAccessStatus(null);
    } finally {
      setIsLoading(false);
      isActionInProgress.current = false;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!user) return;

    try {
      const result = await courierAuthService.refreshProfile();
      if (result) {
        setUser(result.user);
        setAccessStatus(result.accessStatus);
      }
    } catch (err) {
      console.error("Status refresh error:", err);
    }
  }, [user]);

  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedProfile =
        await courierAuthService.updateCourierProfile(data);
      setUser(updatedProfile);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitKYC = useCallback(async (data: KYCSubmitData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await courierAuthService.submitKYC(data);
      setUser(result.user);
      setAccessStatus(result.accessStatus);
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<CourierAuthContextType>(
    () => ({
      // State
      user,
      accessStatus,
      isLoading,
      isAuthenticated,
      isApproved,
      isPending,
      isKycRequired,
      isKycSubmitted,
      isBlocked,
      error,

      // Actions
      signUp,
      signIn,
      signOut,
      refreshStatus,
      updateProfile,
      submitKYC,
      clearError,
    }),
    [
      user,
      accessStatus,
      isLoading,
      isAuthenticated,
      isApproved,
      isPending,
      isKycRequired,
      isKycSubmitted,
      isBlocked,
      error,
      signUp,
      signIn,
      signOut,
      refreshStatus,
      updateProfile,
      submitKYC,
      clearError,
    ],
  );

  return (
    <CourierAuthContext.Provider value={value}>
      {children}
    </CourierAuthContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access courier authentication context.
 * Must be used within a CourierAuthProvider.
 *
 * @returns CourierAuthContextType with auth state and actions
 * @throws Error if used outside CourierAuthProvider
 */
export function useCourierAuth(): CourierAuthContextType {
  const context = useContext(CourierAuthContext);

  if (!context) {
    throw new Error("useCourierAuth must be used within a CourierAuthProvider");
  }

  return context;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook that returns true only if the courier is fully authenticated and approved.
 * Useful for guarding access to delivery-related features.
 */
export function useDeliveryAccess(): boolean {
  const { isAuthenticated, isApproved } = useCourierAuth();
  return isAuthenticated && isApproved;
}

/**
 * Hook that returns the current approval status message.
 * Useful for showing status-specific UI.
 */
export function useApprovalStatus(): {
  status: "approved" | "pending" | "kyc_submitted" | "blocked" | null;
  message: string;
} {
  const { accessStatus } = useCourierAuth();

  if (!accessStatus) {
    return { status: null, message: "" };
  }

  return {
    status: accessStatus.status,
    message: accessStatus.message,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CourierAuthContext;
