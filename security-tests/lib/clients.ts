import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Factories for the three client identities we need:
 *   - admin():   service_role bypasses RLS; used for fixtures / state reads
 *   - anon():    anon-only client; used when a test deliberately calls an
 *                RPC without an auth token
 *   - asCourier(email, password): returns both the authed client and the
 *                raw JWT so scenarios can round-robin tokens
 */

export function admin(): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export function anon(): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY required");
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export interface AuthedCourier {
  client: SupabaseClient;
  token: string;
  userId: string;
  email: string;
}

export async function asCourier(
  email: string,
  password: string,
): Promise<AuthedCourier> {
  const client = anon();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session || !data.user) {
    throw new Error(`signIn failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return {
    client,
    token: data.session.access_token,
    userId: data.user.id,
    email,
  };
}
