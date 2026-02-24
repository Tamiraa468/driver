/**
 * Courier Authentication Service
 *
 * Production-grade authentication service for the courier app.
 * Handles signup, signin, session management, and access control.
 *
 * Key Features:
 * - Email/password authentication via Supabase Auth
 * - Automatic courier role assignment on signup
 * - Approval status checking for delivery task access
 * - Secure profile management with restricted field updates
 * - Robust error handling and session recovery
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../config/supabaseClient";
import {
  AuthError,
  AuthErrorCode,
  AuthResult,
  CourierAccessStatus,
  ProfileUpdateData,
  SignInData,
  SignUpData,
  UserProfile,
} from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  USER: "@courier_app_user",
  ACCESS_STATUS: "@courier_app_access_status",
} as const;

const RETRY_CONFIG = {
  PROFILE_WRITE: 6,
  PROFILE_UPDATE: 4,
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProfileRow = Partial<UserProfile> & { id: string };

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Creates a standardized AuthError object
 */
function createAuthError(
  code: AuthErrorCode,
  message: string,
  originalError?: Error,
): AuthError {
  return { code, message, originalError };
}

/**
 * Maps Supabase error messages to AuthErrorCode
 */
function mapSupabaseError(error: Error): AuthError {
  const message = error.message.toLowerCase();

  const errorMap: Record<string, { code: AuthErrorCode; message: string }> = {
    "invalid login credentials": {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password. Please try again.",
    },
    invalid_credentials: {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password. Please try again.",
    },
    "email not confirmed": {
      code: "EMAIL_NOT_CONFIRMED",
      message: "Please confirm your email address before signing in.",
    },
    "user not found": {
      code: "USER_NOT_FOUND",
      message: "No account found with this email.",
    },
    "database error saving new user": {
      code: "UNKNOWN_ERROR",
      message:
        "Signup is currently blocked by a server database trigger error. Please contact support/admin.",
    },
  };

  // Check for known error patterns
  for (const [pattern, errorInfo] of Object.entries(errorMap)) {
    if (message.includes(pattern)) {
      return createAuthError(errorInfo.code, errorInfo.message, error);
    }
  }

  // Check for network errors
  if (message.includes("network") || message.includes("fetch")) {
    return createAuthError(
      "NETWORK_ERROR",
      "Network error. Please check your connection.",
      error,
    );
  }

  return createAuthError("UNKNOWN_ERROR", error.message, error);
}

// ============================================================================
// PROFILE UTILITIES
// ============================================================================

/**
 * Resolves and validates user role
 */
function resolveRole(
  role: unknown,
  fallback: UserProfile["role"] = "courier",
): UserProfile["role"] {
  const validRoles = [
    "admin",
    "merchant",
    "supplier",
    "courier",
    "customer",
    "org_user",
  ];
  return validRoles.includes(role as string)
    ? (role as UserProfile["role"])
    : fallback;
}

/**
 * Derives role from the `app` metadata field.
 * Falls back to resolveRole(metadata.role) for users created before migration 004.
 */
function roleFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  fallback: UserProfile["role"] = "courier",
): UserProfile["role"] {
  const appMap: Record<string, UserProfile["role"]> = {
    courier_app: "courier",
    merchant_portal: "org_user" as UserProfile["role"],
    customer_app: "customer",
  };
  const app = metadata?.app as string | undefined;
  if (app && app in appMap) return appMap[app];
  // Legacy fallback for pre-migration users
  return resolveRole(metadata?.role, fallback);
}

/**
 * Determines initial status based on role
 */
function resolveStatus(role: UserProfile["role"]): UserProfile["status"] {
  return role === "courier" ? "pending" : "approved";
}

/**
 * Normalizes profile data with fallbacks
 */
function normalizeProfile(
  profile: ProfileRow,
  authEmail: string,
  fallbackRole: UserProfile["role"] = "courier",
): UserProfile {
  const role = resolveRole(profile.role, fallbackRole);
  return {
    id: profile.id,
    email: profile.email || authEmail,
    full_name: profile.full_name ?? null,
    role,
    status: profile.status ?? resolveStatus(role),
    avatar_url: profile.avatar_url ?? null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

/**
 * Checks if error indicates missing email column
 */
function shouldRetryProfileWriteWithEmail(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("email") &&
    (normalized.includes("not-null") || normalized.includes("null value"))
  );
}

/**
 * Checks if error is related to RLS policy
 */
function isRlsError(message: string): boolean {
  return message.toLowerCase().includes("row-level security policy");
}

/**
 * Extracts missing column name from error message
 */
function getMissingProfilesColumn(message: string): string | null {
  const match = message.match(
    /could not find the '([^']+)' column of 'profiles'/i,
  );
  return match?.[1] ?? null;
}

/**
 * Attempts to upsert profile with schema compatibility retries
 */
async function upsertProfile(
  payload: Record<string, unknown>,
  email: string,
): Promise<{ profile: ProfileRow | null; error: string | null }> {
  const candidatePayload = { ...payload };

  for (let attempt = 0; attempt < RETRY_CONFIG.PROFILE_WRITE; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(candidatePayload, { onConflict: "id" })
      .select()
      .single();

    if (!error) {
      return { profile: data as ProfileRow, error: null };
    }

    // Handle missing column errors
    const missingColumn = getMissingProfilesColumn(error.message);
    if (missingColumn && missingColumn in candidatePayload) {
      delete candidatePayload[missingColumn];
      continue;
    }

    // Handle missing email errors
    if (
      shouldRetryProfileWriteWithEmail(error.message) &&
      !("email" in candidatePayload)
    ) {
      candidatePayload.email = email;
      continue;
    }

    return { profile: null, error: error.message };
  }

  return {
    profile: null,
    error: "Profile write failed after multiple schema compatibility retries.",
  };
}

/**
 * Ensures a profile exists for the authenticated user
 */
async function ensureProfileForUser(
  user: AuthUserLike,
  fallbackRole: UserProfile["role"],
): Promise<{ profile: UserProfile | null; error: string | null }> {
  const authEmail = user.email || "";

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return {
      profile: normalizeProfile(
        existingProfile as ProfileRow,
        authEmail,
        fallbackRole,
      ),
      error: null,
    };
  }

  // Extract full name from metadata
  const metadataFullName = user.user_metadata?.full_name;
  const fullName =
    typeof metadataFullName === "string" && metadataFullName.trim()
      ? metadataFullName
      : null;

  // Attempt to create profile
  const { profile: insertedProfile, error: upsertError } = await upsertProfile(
    {
      id: user.id,
      full_name: fullName,
      role: fallbackRole,
      status: resolveStatus(fallbackRole),
    },
    authEmail,
  );

  if (!upsertError && insertedProfile) {
    return {
      profile: normalizeProfile(insertedProfile, authEmail, fallbackRole),
      error: null,
    };
  }

  // Refetch in case profile was created by trigger
  const { data: refetchedProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (refetchedProfile) {
    return {
      profile: normalizeProfile(
        refetchedProfile as ProfileRow,
        authEmail,
        fallbackRole,
      ),
      error: null,
    };
  }

  return { profile: null, error: upsertError || "Profile not found." };
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

/**
 * Determines courier access status based on profile
 */
function determineCourierAccess(
  profile: UserProfile | null,
): CourierAccessStatus {
  if (!profile) {
    return {
      isAuthenticated: false,
      isCourier: false,
      isApproved: false,
      status: null,
      message: "Not authenticated",
    };
  }

  if (profile.role !== "courier") {
    return {
      isAuthenticated: true,
      isCourier: false,
      isApproved: false,
      status: profile.status,
      message:
        "This app is for couriers only. Please use the appropriate app for your role.",
    };
  }

  const statusMessages: Record<UserProfile["status"], string> = {
    approved: "Welcome! You have full access to delivery tasks.",
    pending:
      "Your account is pending approval. You'll be notified once approved.",
    blocked: "Your account has been suspended. Please contact support.",
  };

  const message =
    statusMessages[profile.status] ||
    "Unknown account status. Please contact support.";

  return {
    isAuthenticated: true,
    isCourier: true,
    isApproved: profile.status === "approved",
    status: profile.status,
    message,
  };
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Persists user profile and access status to local storage
 */
async function persistUserData(
  profile: UserProfile,
  accessStatus: CourierAccessStatus,
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile)),
    AsyncStorage.setItem(
      STORAGE_KEYS.ACCESS_STATUS,
      JSON.stringify(accessStatus),
    ),
  ]);
}

/**
 * Clears all persisted user data
 */
async function clearUserData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.USER),
    AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_STATUS),
  ]);
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Signs up a new courier user.
 *
 * Flow:
 * 1. Create auth user with Supabase Auth
 * 2. Insert profile with role='courier' and status='pending'
 * 3. Return user profile and access status
 *
 * @param data - Signup credentials and optional profile data
 * @returns AuthResult with user profile and access status
 * @throws AuthError on failure
 */
export async function signUpCourier(data: SignUpData): Promise<AuthResult> {
  const { email, password, full_name } = data;

  try {
    // Create auth user — send "app" not "role".
    // The DB trigger maps app='courier_app' → role='courier'.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          app: "courier_app",
          full_name: full_name || "",
        },
      },
    });

    if (authError) {
      throw mapSupabaseError(authError);
    }

    if (!authData.user) {
      throw createAuthError(
        "UNKNOWN_ERROR",
        "Signup failed. Please try again.",
      );
    }

    const authEmail = authData.user.email || email;

    // Create fallback profile in case database insert fails
    const fallbackProfile = normalizeProfile(
      {
        id: authData.user.id,
        email: authEmail,
        full_name: full_name || null,
        role: "courier",
        status: "pending",
      },
      authEmail,
      "courier",
    );

    // Supabase often returns no session on signup when email confirmation is enabled.
    // Without an authenticated JWT, profile insert/upsert will fail with 401.
    if (!authData.session) {
      const accessStatus = determineCourierAccess(fallbackProfile);
      await persistUserData(fallbackProfile, accessStatus);
      return { user: fallbackProfile, accessStatus };
    }

    // Create profile in database
    const profileData = {
      id: authData.user.id,
      email: authEmail,
      full_name: full_name || null,
      role: "courier",
      status: "pending",
    };

    const { profile, error: profileError } = await upsertProfile(
      profileData,
      authEmail,
    );

    // Handle profile creation errors
    if (profileError) {
      if (isRlsError(profileError)) {
        console.warn(
          "Profile creation deferred until first authenticated session:",
          profileError,
        );
      } else {
        console.error("Profile creation error:", profileError);
      }

      const accessStatus = determineCourierAccess(fallbackProfile);
      await persistUserData(fallbackProfile, accessStatus);

      return { user: fallbackProfile, accessStatus };
    }

    // Return successful result
    const userProfile = profile
      ? normalizeProfile(profile, authEmail, "courier")
      : fallbackProfile;
    const accessStatus = determineCourierAccess(userProfile);
    await persistUserData(userProfile, accessStatus);

    return { user: userProfile, accessStatus };
  } catch (error) {
    if ((error as AuthError).code) {
      throw error;
    }
    throw mapSupabaseError(error as Error);
  }
}

/**
 * Signs in a courier user.
 *
 * Flow:
 * 1. Authenticate with Supabase Auth
 * 2. Fetch profile from profiles table
 * 3. Validate role is 'courier'
 * 4. Check approval status
 * 5. Return user profile and access status
 *
 * @param data - Sign in credentials
 * @returns AuthResult with user profile and access status
 * @throws AuthError on failure or if user is not a courier
 */
export async function signInCourier(data: SignInData): Promise<AuthResult> {
  const { email, password } = data;

  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      throw mapSupabaseError(authError);
    }

    if (!authData.user) {
      throw createAuthError(
        "UNKNOWN_ERROR",
        "Sign in failed. Please try again.",
      );
    }

    const fallbackRole = roleFromMetadata(
      authData.user.user_metadata,
      "courier",
    );
    const { profile: userProfile, error: profileError } =
      await ensureProfileForUser(authData.user as AuthUserLike, fallbackRole);

    if (!userProfile) {
      await supabase.auth.signOut();
      throw createAuthError(
        "PROFILE_NOT_FOUND",
        profileError || "Profile not found. Please contact support.",
      );
    }

    // Validate role is courier
    if (userProfile.role !== "courier") {
      await supabase.auth.signOut();
      throw createAuthError(
        "NOT_A_COURIER",
        "This app is for couriers only. Please use the appropriate app for your role.",
      );
    }

    // Check status and determine access
    const accessStatus = determineCourierAccess(userProfile);

    // Block suspended users
    if (userProfile.status === "blocked") {
      await supabase.auth.signOut();
      throw createAuthError(
        "ACCOUNT_BLOCKED",
        "Your account has been suspended. Please contact support.",
      );
    }

    // Persist data and return
    await persistUserData(userProfile, accessStatus);

    return { user: userProfile, accessStatus };
  } catch (error) {
    if ((error as AuthError).code) {
      throw error;
    }
    throw mapSupabaseError(error as Error);
  }
}

/**
 * Signs out the current user.
 */
export async function signOutCourier(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Sign out error:", error);
  } finally {
    // Always clear local data
    await clearUserData();
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Restores session from storage and validates with Supabase.
 *
 * @returns AuthResult if session is valid, null if no session
 */
export async function restoreSession(): Promise<AuthResult | null> {
  try {
    // Check for Supabase session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      await clearUserData();
      return null;
    }

    const fallbackRole = roleFromMetadata(
      session.user.user_metadata,
      "courier",
    );

    const { profile: userProfile } = await ensureProfileForUser(
      session.user as AuthUserLike,
      fallbackRole,
    );

    if (!userProfile) {
      await signOutCourier();
      return null;
    }

    // Validate role
    if (userProfile.role !== "courier") {
      await signOutCourier();
      return null;
    }

    // Determine access and persist
    const accessStatus = determineCourierAccess(userProfile);
    await persistUserData(userProfile, accessStatus);

    return { user: userProfile, accessStatus };
  } catch (error) {
    console.error("Session restore error:", error);
    await clearUserData();
    return null;
  }
}

/**
 * Gets the current user from local storage (fast, no network).
 */
export async function getCachedUser(): Promise<UserProfile | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Gets the cached access status.
 */
export async function getCachedAccessStatus(): Promise<CourierAccessStatus | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_STATUS);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Checks if the current courier has access to delivery tasks.
 * This should be called before showing delivery-related screens.
 *
 * @returns CourierAccessStatus with current access level
 */
export async function checkCourierAccess(): Promise<CourierAccessStatus> {
  try {
    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return determineCourierAccess(null);
    }

    const fallbackRole = roleFromMetadata(
      session.user.user_metadata,
      "courier",
    );

    const { profile: userProfile } = await ensureProfileForUser(
      session.user as AuthUserLike,
      fallbackRole,
    );

    if (!userProfile) {
      return determineCourierAccess(null);
    }

    const accessStatus = determineCourierAccess(userProfile);

    // Update cached data
    await persistUserData(userProfile, accessStatus);

    return accessStatus;
  } catch (error) {
    console.error("Access check error:", error);
    // Return cached status if available
    const cached = await getCachedAccessStatus();
    return cached || determineCourierAccess(null);
  }
}

/**
 * Refreshes the user profile from the server.
 * Use this to check if status has changed (e.g., pending → approved).
 *
 * @returns Updated AuthResult or null if not authenticated
 */
export async function refreshProfile(): Promise<AuthResult | null> {
  return restoreSession();
}

// ============================================================================
// PROFILE UPDATES
// ============================================================================

/**
 * Updates the courier's profile.
 * SECURITY: Only full_name can be updated by the user.
 * Role and status are protected by RLS policies.
 *
 * @param data - Fields to update (full_name only)
 * @returns Updated user profile
 * @throws AuthError on failure
 */
export async function updateCourierProfile(
  data: ProfileUpdateData,
): Promise<UserProfile> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      throw createAuthError("USER_NOT_FOUND", "Not authenticated");
    }

    const authEmail = session.user.email || "";
    const fallbackRole = roleFromMetadata(
      session.user.user_metadata,
      "courier",
    );

    // Only allow updating full_name
    const safeData: ProfileUpdateData = {};
    if (data.full_name !== undefined) {
      safeData.full_name = data.full_name;
    }

    const updatePayload: Record<string, unknown> = { ...safeData };
    let profile: ProfileRow | null = null;
    let updateErrorMessage: string | null = null;

    // Attempt update if there are fields to update
    if (Object.keys(updatePayload).length > 0) {
      for (let attempt = 0; attempt < RETRY_CONFIG.PROFILE_UPDATE; attempt++) {
        const { data: updatedProfile, error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", session.user.id)
          .select()
          .single();

        if (!error) {
          profile = updatedProfile as ProfileRow;
          updateErrorMessage = null;
          break;
        }

        // Handle missing column errors
        const missingColumn = getMissingProfilesColumn(error.message);
        if (missingColumn && missingColumn in updatePayload) {
          delete updatePayload[missingColumn];
          continue;
        }

        updateErrorMessage = error.message;
        break;
      }
    }

    // Fetch current profile if update failed or no fields to update
    if (!profile) {
      const { data: currentProfile, error: fetchProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (fetchProfileError || !currentProfile) {
        throw createAuthError(
          "UNKNOWN_ERROR",
          updateErrorMessage ||
            fetchProfileError?.message ||
            "Profile update failed",
        );
      }

      profile = currentProfile as ProfileRow;
    }

    const userProfile = normalizeProfile(profile, authEmail, fallbackRole);
    const accessStatus = determineCourierAccess(userProfile);
    await persistUserData(userProfile, accessStatus);

    return userProfile;
  } catch (error) {
    if ((error as AuthError).code) {
      throw error;
    }
    throw mapSupabaseError(error as Error);
  }
}

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

/**
 * Sends a password reset email.
 *
 * @param email - Email address to send reset link to
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "com.courier.app://reset-password",
  });

  if (error) {
    throw mapSupabaseError(error);
  }
}

/**
 * Updates the user's password (when already authenticated).
 *
 * @param newPassword - New password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw mapSupabaseError(error);
  }
}

// ============================================================================
// AUTH STATE LISTENER
// ============================================================================

/**
 * Sets up a listener for auth state changes.
 * Useful for handling session expiry, etc.
 *
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, profile: UserProfile | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) {
      await clearUserData();
      callback(event, null);
      return;
    }

    const fallbackRole = roleFromMetadata(
      session.user.user_metadata,
      "courier",
    );

    const { profile: userProfile } = await ensureProfileForUser(
      session.user as AuthUserLike,
      fallbackRole,
    );

    if (userProfile) {
      const accessStatus = determineCourierAccess(userProfile);
      await persistUserData(userProfile, accessStatus);
      callback(event, userProfile);
    } else {
      callback(event, null);
    }
  });

  return () => subscription.unsubscribe();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  signUpCourier,
  signInCourier,
  signOutCourier,
  restoreSession,
  checkCourierAccess,
  refreshProfile,
  updateCourierProfile,
  sendPasswordReset,
  updatePassword,
  getCachedUser,
  getCachedAccessStatus,
  onAuthStateChange,
};
