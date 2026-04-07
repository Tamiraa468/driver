import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../config/supabaseClient";
import { SignInData, SignUpData, UserProfile, UserRole } from "../types";

const USER_STORAGE_KEY = "@delivery_app_user";
type ProfileRow = Partial<UserProfile> & { id: string };

const resolveRole = (role?: UserRole): UserRole => role || "customer";

/**
 * Derives role from the `app` metadata field.
 * Falls back to metadata.role for users created before migration 004.
 */
const roleFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  fallback: UserRole = "customer",
): UserRole => {
  const appMap: Record<string, UserRole> = {
    courier_app: "courier",
    customer_app: "customer",
  };
  const app = metadata?.app as string | undefined;
  if (app && app in appMap) return appMap[app];
  return resolveRole(metadata?.role as UserRole | undefined) || fallback;
};

const resolveStatus = (role: UserRole): UserProfile["status"] =>
  role === "courier" ? "pending" : "approved";

const normalizeProfile = (
  profile: ProfileRow,
  authEmail: string,
  fallbackRole: UserRole,
): UserProfile => ({
  id: profile.id,
  email: profile.email || authEmail,
  full_name: profile.full_name ?? null,
  phone: profile.phone ?? null,
  role: (profile.role as UserRole) || fallbackRole,
  status: profile.status ?? resolveStatus(fallbackRole),
  avatar_url: profile.avatar_url ?? null,
  created_at: profile.created_at,
  updated_at: profile.updated_at,
});

const mapAuthErrorMessage = (
  error: Error & { status?: number; code?: string },
): string => {
  const normalized = (error.message || "").toLowerCase();
  const status = error.status;
  const code = (error.code || "").toLowerCase();
  if (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("for security purposes")
  ) {
    return "Бүртгүүлэх оролдлого хэт олон байна. Хэдэн минут хүлээгээд дахин оролдоно уу.";
  }
  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials")
  ) {
    return "И-мэйл эсвэл нууц үг буруу байна. Дахин оролдоно уу.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Нэвтрэхээсээ өмнө и-мэйл хаягаа баталгаажуулна уу.";
  }
  if (normalized.includes("database error saving new user")) {
    return "Серверийн өгөгдлийн сангийн алдаанаас болж бүртгэл үүсгэх боломжгүй байна.";
  }
  if (normalized.includes("too many requests")) {
    return "Бүртгүүлэх оролдлого хэт олон байна. Хэдэн минут хүлээгээд дахин оролдоно уу.";
  }
  if (normalized.includes("over_email_send_rate_limit")) {
    return "Баталгаажуулах и-мэйл хэт олон илгээгдсэн байна. Түр хүлээгээд дахин хүсэлт гаргана уу.";
  }
  return error.message;
};

// Sign in with email and password
export const signIn = async ({
  email,
  password,
}: SignInData): Promise<UserProfile> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(mapAuthErrorMessage(error));
  }

  if (!data.user) {
    throw new Error("Хэрэглэгчийн мэдээлэл олдсонгүй");
  }

  const authEmail = data.user.email || email;
  const fallbackRole = roleFromMetadata(data.user.user_metadata);

  // Fetch user profile with role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    const mockProfile = normalizeProfile(
      {
        id: data.user.id,
        role: fallbackRole,
        status: resolveStatus(fallbackRole),
      },
      authEmail,
      fallbackRole,
    );
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockProfile));
    return mockProfile;
  }

  const userProfile = normalizeProfile(
    profile as ProfileRow,
    authEmail,
    fallbackRole,
  );

  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
  return userProfile;
};

// Sign up with email, password, and role
export const signUp = async ({
  email,
  password,
  role,
}: SignUpData): Promise<UserProfile> => {
  const resolvedRole = resolveRole(role);
  const resolvedStatus = resolveStatus(resolvedRole);

  // Map client role to app identifier for the DB trigger.
  const appMap: Record<string, string> = {
    courier: "courier_app",
    customer: "customer_app",
  };
  const appIdentifier = appMap[resolvedRole] || "merchant_portal";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        app: appIdentifier,
      },
    },
  });

  if (error) {
    throw new Error(mapAuthErrorMessage(error));
  }

  if (!data.user) {
    throw new Error("Хэрэглэгчийн мэдээлэл олдсонгүй");
  }

  if (!data.session) {
    const userProfile = normalizeProfile(
      {
        id: data.user.id,
        email,
        role: resolvedRole,
        status: resolvedStatus,
      },
      email,
      resolvedRole,
    );

    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
    return userProfile;
  }

  const userProfile = normalizeProfile(
    {
      id: data.user.id,
      email,
      role: resolvedRole,
      status: resolvedStatus,
    },
    email,
    resolvedRole,
  );

  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
  return userProfile;
};

// Sign out
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  await AsyncStorage.removeItem(USER_STORAGE_KEY);

  if (error) {
    throw new Error(error.message);
  }
};

// Restore session from storage
export const restoreSession = async (): Promise<UserProfile | null> => {
  try {
    // Try to get from Supabase first
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const authEmail = session.user.email || "";
      const fallbackRole = roleFromMetadata(session.user.user_metadata);

      // Try to get profile from Supabase
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        const userProfile = normalizeProfile(
          profile as ProfileRow,
          authEmail,
          fallbackRole,
        );
        await AsyncStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify(userProfile),
        );
        return userProfile;
      }

      // Profile row is missing - keep user authenticated from auth.users
      const fallbackProfile = normalizeProfile(
        {
          id: session.user.id,
          role: fallbackRole,
          status: resolveStatus(fallbackRole),
        },
        authEmail,
        fallbackRole,
      );
      await AsyncStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(fallbackProfile),
      );
      return fallbackProfile;
    }

    // Fall back to local storage
    const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      return JSON.parse(storedUser) as UserProfile;
    }

    return null;
  } catch (error) {
    console.error("Error restoring session:", error);
    return null;
  }
};

// Get current user from storage
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      return JSON.parse(storedUser) as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
};
