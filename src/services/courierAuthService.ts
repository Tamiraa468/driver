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
  KYCSubmitData,
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
      message: "И-мэйл эсвэл нууц үг буруу байна. Дахин оролдоно уу.",
    },
    invalid_credentials: {
      code: "INVALID_CREDENTIALS",
      message: "И-мэйл эсвэл нууц үг буруу байна. Дахин оролдоно уу.",
    },
    "email not confirmed": {
      code: "EMAIL_NOT_CONFIRMED",
      message: "Нэвтрэхээсээ өмнө и-мэйл хаягаа баталгаажуулна уу.",
    },
    "user not found": {
      code: "USER_NOT_FOUND",
      message: "Энэ и-мэйлтэй бүртгэл олдсонгүй.",
    },
    "database error saving new user": {
      code: "UNKNOWN_ERROR",
      message:
        "Серверийн өгөгдлийн сангийн алдаанаас болж бүртгэл үүсгэх боломжгүй байна. Админ эсвэл дэмжлэгтэй холбогдоно уу.",
    },
    "refresh token not found": {
      code: "UNKNOWN_ERROR",
      message: "Сешн хугацаа дууссан байна. Дахин нэвтэрнэ үү.",
    },
    "invalid refresh token": {
      code: "UNKNOWN_ERROR",
      message: "Сешн хугацаа дууссан байна. Дахин нэвтэрнэ үү.",
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
      "Сүлжээний алдаа гарлаа. Холболтоо шалгана уу.",
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
    phone: profile.phone ?? null,
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
    error: "Профайл хадгалах оролдлого хэд хэдэн удаа амжилтгүй боллоо.",
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

  return { profile: null, error: upsertError || "Профайл олдсонгүй." };
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
      message: "Нэвтрээгүй байна",
    };
  }

  if (profile.role !== "courier") {
    return {
      isAuthenticated: true,
      isCourier: false,
      isApproved: false,
      status: profile.status,
      message:
        "Энэ апп зөвхөн курьеруудад зориулсан. Өөрийн эрхэд тохирох аппыг ашиглана уу.",
    };
  }

  const statusMessages: Record<UserProfile["status"], string> = {
    approved: "Тавтай морил. Та хүргэлтийн даалгавруудад бүрэн хандах эрхтэй боллоо.",
    pending:
      "Хүргэлт хийж эхлэхээс өмнө таны бүртгэл KYC баталгаажуулалт шаардана.",
    kyc_submitted:
      "Таны KYC бичиг баримтууд хяналтад байна. Баталгаажмагц танд мэдэгдэнэ.",
    blocked: "Таны бүртгэл түдгэлзсэн байна. Дэмжлэгтэй холбогдоно уу.",
  };

  const message =
    statusMessages[profile.status] ||
    "Бүртгэлийн төлөв тодорхойгүй байна. Дэмжлэгтэй холбогдоно уу.";

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
  const { email, password, full_name, phone } = data;

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
          phone: phone || "",
        },
      },
    });

    if (authError) {
      throw mapSupabaseError(authError);
    }

    if (!authData.user) {
      throw createAuthError(
        "UNKNOWN_ERROR",
        "Бүртгэл үүсгэж чадсангүй. Дахин оролдоно уу.",
      );
    }

    const authEmail = authData.user.email || email;

    // Create fallback profile in case database insert fails
    const fallbackProfile = normalizeProfile(
      {
        id: authData.user.id,
        email: authEmail,
        full_name: full_name || null,
        phone: phone || null,
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
      phone: phone || null,
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
        "Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.",
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
        profileError || "Профайл олдсонгүй. Дэмжлэгтэй холбогдоно уу.",
      );
    }

    // Validate role is courier
    if (userProfile.role !== "courier") {
      await supabase.auth.signOut();
      throw createAuthError(
        "NOT_A_COURIER",
        "Энэ апп зөвхөн курьеруудад зориулсан. Өөрийн эрхэд тохирох аппыг ашиглана уу.",
      );
    }

    // Check status and determine access
    const accessStatus = determineCourierAccess(userProfile);

    // Block suspended users
    if (userProfile.status === "blocked") {
      await supabase.auth.signOut();
      throw createAuthError(
        "ACCOUNT_BLOCKED",
        "Таны бүртгэл түдгэлзсэн байна. Дэмжлэгтэй холбогдоно уу.",
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
      error: sessionError,
    } = await supabase.auth.getSession();

    // Handle refresh token errors
    if (sessionError) {
      const errorMsg = sessionError.message?.toLowerCase() || "";
      if (
        errorMsg.includes("refresh") ||
        errorMsg.includes("invalid") ||
        errorMsg.includes("expired")
      ) {
        console.warn("Invalid/expired session detected. Clearing auth state.");
        await supabase.auth.signOut();
        await clearUserData();
        return null;
      }
      throw sessionError;
    }

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
      error: sessionError,
    } = await supabase.auth.getSession();

    // Handle refresh token errors
    if (sessionError) {
      const errorMsg = sessionError.message?.toLowerCase() || "";
      if (
        errorMsg.includes("refresh") ||
        errorMsg.includes("invalid") ||
        errorMsg.includes("expired")
      ) {
        console.warn("Invalid/expired session in checkCourierAccess. Clearing.");
        await supabase.auth.signOut();
        await clearUserData();
        return determineCourierAccess(null);
      }
    }

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
 * SECURITY: Only full_name and phone can be updated by the user.
 * Role and status are protected by RLS policies.
 *
 * @param data - Fields to update (full_name, phone)
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
      throw createAuthError("USER_NOT_FOUND", "Нэвтрээгүй байна");
    }

    const authEmail = session.user.email || "";
    const fallbackRole = roleFromMetadata(
      session.user.user_metadata,
      "courier",
    );

    // Only allow updating full_name and phone
    const safeData: ProfileUpdateData = {};
    if (data.full_name !== undefined) {
      safeData.full_name = data.full_name;
    }
    if (data.phone !== undefined) {
      safeData.phone = data.phone;
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
            "Профайл шинэчилж чадсангүй",
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
// KYC SUBMISSION
// ============================================================================

/**
 * Submits KYC (Know Your Customer) documents for verification.
 *
 * Flow:
 * 1. Upload document URLs to courier_kyc table
 * 2. Update profile status to 'kyc_submitted'
 * 3. Return updated AuthResult
 *
 * @param data - KYC document URLs and vehicle info
 * @returns AuthResult with updated status
 * @throws AuthError on failure
 */
export async function submitKYC(data: KYCSubmitData): Promise<AuthResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      throw createAuthError("USER_NOT_FOUND", "Нэвтрээгүй байна");
    }

    const userId = session.user.id;
    const authEmail = session.user.email || "";

    // 1. Upsert KYC record
    const { error: kycError } = await supabase.from("courier_kyc").upsert(
      {
        courier_id: userId,
        id_front_url: data.id_front_url,
        id_back_url: data.id_back_url,
        vehicle_registration_url: data.vehicle_registration_url || null,
        selfie_url: data.selfie_url || null,
        vehicle_type: data.vehicle_type || null,
        license_plate: data.license_plate || null,
        status: "pending",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "courier_id" },
    );

    if (kycError) {
      console.error("KYC insert error:", kycError.message);
      throw createAuthError(
        "UNKNOWN_ERROR",
        "KYC бичиг баримт илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
      );
    }

    // 2. Update profile status to kyc_submitted
    const { data: updatedProfile, error: profileError } = await supabase
      .from("profiles")
      .update({ status: "kyc_submitted" })
      .eq("id", userId)
      .select()
      .single();

    if (profileError) {
      console.error("Profile status update error:", profileError.message);
      throw createAuthError("UNKNOWN_ERROR", "Статус шинэчлэхэд алдаа гарлаа.");
    }

    const fallbackRole = roleFromMetadata(
      session.user.user_metadata,
      "courier",
    );
    const userProfile = normalizeProfile(
      updatedProfile as ProfileRow,
      authEmail,
      fallbackRole,
    );
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

/**
 * Manually clears all authentication state.
 * Use this as a recovery mechanism when refresh token errors occur.
 */
export async function clearAuthState(): Promise<void> {
  try {
    console.log("[Auth] Manually clearing auth state...");
    await supabase.auth.signOut();
    await clearUserData();
    console.log("[Auth] Auth state cleared successfully");
  } catch (error) {
    console.error("[Auth] Error clearing auth state:", error);
    // Force clear local storage even if signOut fails
    await clearUserData();
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
    // Handle token refresh errors gracefully
    if (event === "TOKEN_REFRESHED" && !session) {
      console.warn("Token refresh failed. Signing out.");
      await clearUserData();
      callback("SIGNED_OUT", null);
      return;
    }

    if (event === "SIGNED_OUT" || !session?.user) {
      await clearUserData();
      callback(event, null);
      return;
    }

    try {
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
    } catch (error) {
      console.error("Auth state change error:", error);
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
  submitKYC,
  sendPasswordReset,
  updatePassword,
  getCachedUser,
  getCachedAccessStatus,
  onAuthStateChange,
  clearAuthState,
};
