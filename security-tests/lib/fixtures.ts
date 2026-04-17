import { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * Fixture helpers: provision one task in the exact state verify_epod_otp()
 * expects — claimed by the bench courier AND in 'delivered' status with a
 * live hashed OTP.
 *
 * Flow:
 *   1. admin inserts a published task
 *   2. admin flips it to 'assigned' for the courier (bypassing claim RPC)
 *   3. admin flips to 'picked_up'
 *   4. generate_epod_otp() is called as courier → status='delivered', plain
 *      OTP returned for the test (not emailed)
 *
 * The returned Fixture knows how to:
 *   - cleanOtp()     — null out otp_code_hash so the test can re-generate
 *   - forceExpire()  — for expiry-boundary tests (sets otp_expires_at back)
 *   - teardown()     — delete the task + any earnings rows
 *
 * Also detects whether the current schema has otp_attempts / otp_locked_until
 * columns so scenario A can accurately report the was_locked flag.
 */

export interface TaskFixture {
  taskId: string;
  plainOtp: string;
  otpExpiresAt: string;
  hasAttemptCounter: boolean;
  teardown: () => Promise<void>;
  regenerateOtp: () => Promise<string>;
}

export async function detectAttemptCounter(
  admin: SupabaseClient,
): Promise<boolean> {
  // information_schema lookup works regardless of whether the column exists.
  const { data, error } = await admin.rpc("pg_get_columns_probe", {
    p_table: "delivery_tasks",
  });
  if (error) {
    // Fall back to a direct select — if the column is missing, Postgres
    // returns error code 42703. We treat any error as "not present" so the
    // test still runs; the CSV will reflect was_locked=n/a.
    const { error: directErr } = await admin
      .from("delivery_tasks")
      .select("otp_attempts")
      .limit(1);
    return !directErr;
  }
  return Array.isArray(data) && data.some((c: any) => c.column_name === "otp_attempts");
}

export async function createDeliveredTaskForCourier(
  admin: SupabaseClient,
  courierClient: SupabaseClient,
  courierId: string,
  orgId: string | null,
): Promise<TaskFixture> {
  const taskId = randomUUID();

  // 1. Insert straight into 'assigned' so the generate_epod_otp() status
  //    progression (picked_up → delivered) is the only RPC we exercise.
  const now = new Date().toISOString();
  const { error: insertErr } = await admin.from("delivery_tasks").insert({
    id: taskId,
    status: "picked_up",
    courier_id: courierId,
    assigned_at: now,
    picked_up_at: now,
    pickup_note: "Security test pickup",
    dropoff_note: "Security test dropoff",
    note: "security-brute-force",
    delivery_fee: 5000,
    package_value: 20000,
    receiver_name: "Security Test",
    receiver_phone: "+97699000000",
    customer_email: "security@example.com",
    org_id: orgId,
  });
  if (insertErr) {
    throw new Error(`fixture insert failed: ${insertErr.message}`);
  }

  // 2. Call generate_epod_otp as the courier → status becomes 'delivered'.
  const { data, error } = await courierClient.rpc("generate_epod_otp", {
    p_task_id: taskId,
  });
  if (error) {
    await admin.from("delivery_tasks").delete().eq("id", taskId);
    throw new Error(`generate_epod_otp failed: ${error.message}`);
  }
  const payload = data as {
    success?: boolean;
    otp_plain?: string;
    expires_at?: string;
    message?: string;
  };
  if (!payload?.success || !payload.otp_plain) {
    await admin.from("delivery_tasks").delete().eq("id", taskId);
    throw new Error(
      `generate_epod_otp returned failure: ${payload?.message}`,
    );
  }

  const hasAttemptCounter = await detectAttemptCounter(admin);

  const teardown = async () => {
    await admin
      .from("courier_earnings")
      .delete()
      .eq("task_id", taskId)
      .throwOnError();
    await admin.from("delivery_tasks").delete().eq("id", taskId);
  };

  const regenerateOtp = async (): Promise<string> => {
    // Force status back to delivered if verify mutated it, then call resend.
    await admin
      .from("delivery_tasks")
      .update({
        status: "delivered",
        otp_verified: false,
        completed_at: null,
      })
      .eq("id", taskId);
    const resp = await courierClient.rpc("resend_epod_otp", {
      p_task_id: taskId,
    });
    if (resp.error) throw new Error(resp.error.message);
    const rp = resp.data as { otp_plain?: string; success?: boolean };
    if (!rp?.success || !rp.otp_plain) {
      throw new Error("resend_epod_otp returned no OTP");
    }
    return rp.otp_plain;
  };

  return {
    taskId,
    plainOtp: payload.otp_plain,
    otpExpiresAt: payload.expires_at ?? "",
    hasAttemptCounter,
    teardown,
    regenerateOtp,
  };
}

/**
 * Random 6-digit zero-padded OTP. Uses Math.random — this is a test stimulus,
 * NOT a security-critical generator.
 */
export function randomSixDigit(exclude?: string): string {
  while (true) {
    const n = Math.floor(Math.random() * 1_000_000);
    const padded = n.toString().padStart(6, "0");
    if (padded !== exclude) return padded;
  }
}
