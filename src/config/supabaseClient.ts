import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import "react-native-url-polyfill/auto";

const supabaseUrl = (
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://placeholder.supabase.co"
).trim();

const supabaseAnonKey = (
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-anon-key"
).trim();

// Debug: log resolved values on startup (key is truncated for safety)
console.log("[Supabase] URL:", supabaseUrl);
console.log(
  "[Supabase] Key:",
  supabaseAnonKey.substring(0, 20) +
    "..." +
    ` (${supabaseAnonKey.length} chars)`,
);

if (
  supabaseUrl === "https://placeholder.supabase.co" ||
  supabaseAnonKey === "placeholder-anon-key"
) {
  console.error(
    "[Supabase] ⚠️  Using placeholder credentials! " +
      "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY " +
      "environment variables or configure them in app.json extra.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Bypass navigator.locks — causes AbortError on web hot-reload and is
    // unnecessary here because AsyncStorage already serialises access.
    lock: (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) =>
      fn(),
  },
});

export { supabaseAnonKey, supabaseUrl };
