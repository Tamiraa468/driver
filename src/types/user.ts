// User types — must match DB CHECK constraint on profiles.role
export type UserRole =
  | "admin"
  | "merchant"
  | "supplier"
  | "courier"
  | "customer"
  | "org_user";

// Profile status for approval workflow
export type ProfileStatus = "pending" | "approved" | "blocked";

// Base user profile matching Supabase profiles table
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: ProfileStatus;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Courier-specific profile with additional computed fields
export interface CourierProfile extends UserProfile {
  role: "courier";
  // Computed/extended fields (from joins or client-side)
  total_deliveries?: number;
  rating?: number;
  is_online?: boolean;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

// Auth state with courier-specific access info
export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Courier-specific: indicates if courier can access delivery tasks
  hasDeliveryAccess: boolean;
}

// Courier access status for detailed UI feedback
export interface CourierAccessStatus {
  isAuthenticated: boolean;
  isCourier: boolean;
  isApproved: boolean;
  status: ProfileStatus | null;
  message: string;
}

// Sign up data - courier app always registers as courier
export interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  // Used by generic auth flows; courierAuthService always forces role='courier'
  role?: UserRole;
}

// Sign in credentials
export interface SignInData {
  email: string;
  password: string;
}

// Profile update data - only allowed fields for couriers
export interface ProfileUpdateData {
  full_name?: string;
  phone?: string;
}

// Authentication result from sign up/sign in
export interface AuthResult {
  user: UserProfile;
  accessStatus: CourierAccessStatus;
}

// Error types for better error handling
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_CONFIRMED"
  | "USER_NOT_FOUND"
  | "PROFILE_NOT_FOUND"
  | "NOT_A_COURIER"
  | "ACCOUNT_PENDING"
  | "ACCOUNT_BLOCKED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  originalError?: Error;
}
