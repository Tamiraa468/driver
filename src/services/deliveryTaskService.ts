import { supabase, supabaseAnonKey, supabaseUrl } from "../config/supabaseClient";
import {
  AvailableTask,
  ClaimTaskResponse,
  CourierDashboardTask,
  DeliveryTask,
} from "../types/order";

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

interface CourierDashboardTaskRow {
  id: string;
  courier_id: string | null;
  status: CourierDashboardTask["status"];
  delivery_fee: number | string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  pickup_note?: string | null;
  dropoff_note?: string | null;
  created_at: string;
  updated_at: string;
}

function mapDashboardTaskRow(
  item: CourierDashboardTaskRow,
): CourierDashboardTask {
  const pickupAddress = item.pickup_address ?? item.pickup_note;
  const dropoffAddress = item.dropoff_address ?? item.dropoff_note;

  return {
    id: item.id,
    courier_id: item.courier_id,
    status: item.status,
    delivery_fee: toNumber(item.delivery_fee),
    accepted_at: item.assigned_at ?? null,
    assigned_at: item.assigned_at ?? null,
    picked_up_at: item.picked_up_at ?? null,
    delivered_at: item.delivered_at ?? null,
    pickup_address: pickupAddress ?? "Авах цэгийн мэдээлэлгүй",
    dropoff_address: dropoffAddress ?? "Хүргэх цэгийн мэдээлэлгүй",
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * Fetch available tasks from the available_tasks table
 * This table is automatically synced via database trigger
 * Only shows tasks with status = 'published'
 */
export const fetchAvailableTasks = async (): Promise<AvailableTask[]> => {
  try {
    const { data, error } = await supabase.rpc("get_available_tasks", {
      p_limit: 50,
      p_offset: 0,
    });

    if (error) {
      console.error("Error fetching available tasks:", error);
      throw error;
    }

    return (data as AvailableTask[]) || [];
  } catch (error) {
    console.error("fetchAvailableTasks error:", error);
    throw error;
  }
};

/**
 * Alternative: Direct query to available_tasks table
 * Use this if you don't want to use the RPC function
 * Note: This won't include location addresses - use get_available_tasks RPC for that
 */
export const fetchAvailableTasksDirect = async (): Promise<AvailableTask[]> => {
  try {
    const { data, error } = await supabase
      .from("available_tasks")
      .select(
        `
        task_id,
        order_id,
        pickup_location_id,
        dropoff_location_id,
        pickup_note,
        dropoff_note,
        note,
        package_value,
        delivery_fee,
        suggested_fee,
        receiver_name,
        receiver_phone,
        receiver_email,
        created_at,
        org_id
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching available tasks direct:", error);
      throw error;
    }

    // Format the response to match AvailableTask interface
    const tasks: AvailableTask[] = (data || []).map((item: any) => ({
      task_id: item.task_id,
      order_id: item.order_id,
      pickup_location_id: item.pickup_location_id,
      dropoff_location_id: item.dropoff_location_id,
      pickup_address: null, // Not available in direct query
      dropoff_address: null, // Not available in direct query
      pickup_note: item.pickup_note,
      dropoff_note: item.dropoff_note,
      note: item.note,
      package_value: item.package_value,
      delivery_fee: item.delivery_fee,
      suggested_fee: item.suggested_fee,
      receiver_name: item.receiver_name,
      receiver_phone: item.receiver_phone,
      receiver_email: item.receiver_email,
      created_at: item.created_at,
    }));

    return tasks;
  } catch (error) {
    console.error("fetchAvailableTasksDirect error:", error);
    throw error;
  }
};

/**
 * Claim a delivery task (race-condition safe)
 * Uses the claim_delivery_task() database function with atomic update
 * Prevents multiple couriers from claiming the same task
 */
export const claimDeliveryTask = async (
  taskId: string,
): Promise<ClaimTaskResponse> => {
  try {
    const { data, error } = await supabase.rpc("claim_delivery_task", {
      p_task_id: taskId,
    });

    if (error) {
      console.error("Error claiming task:", error);
      throw error;
    }

    return data as ClaimTaskResponse;
  } catch (error) {
    console.error("claimDeliveryTask error:", error);
    throw error;
  }
};

/**
 * Fetch courier's assigned tasks (tasks they've claimed)
 * Includes assigned, picked_up, and delivered statuses
 */
export const fetchCourierAssignedTasks = async (): Promise<DeliveryTask[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error("Нэвтрээгүй байна");
    }

    const { data, error } = await supabase
      .from("delivery_tasks")
      .select("id, order_id, status, delivery_fee, pickup_note, dropoff_note, receiver_name, receiver_phone, customer_email, note, assigned_at, picked_up_at, delivered_at, created_at, courier_id")
      .eq("courier_id", session.user.id)
      .in("status", ["assigned", "picked_up", "delivered"])
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching assigned tasks:", error);
      throw error;
    }

    return (data as DeliveryTask[]) || [];
  } catch (error) {
    console.error("fetchCourierAssignedTasks error:", error);
    throw error;
  }
};

/**
 * Real-time subscription to the courier's assigned delivery tasks.
 * Listens for changes on delivery_tasks and refetches when the courier's rows change.
 */
export const subscribeToCourierTasks = (
  callback: (tasks: DeliveryTask[]) => void,
) => {
  const subscription = supabase
    .channel("courier_assigned_tasks_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "delivery_tasks",
      },
      async () => {
        try {
          const tasks = await fetchCourierAssignedTasks();
          callback(tasks);
        } catch (err) {
          console.error("[subscribeToCourierTasks] refetch error:", err);
        }
      },
    )
    .subscribe();

  return subscription;
};

/**
 * Update task status (for courier workflow: assigned → picked_up → delivered)
 * Uses SECURITY DEFINER RPC to bypass RLS policy recursion.
 */
export const updateTaskStatus = async (
  taskId: string,
  newStatus: "picked_up" | "delivered",
): Promise<DeliveryTask> => {
  try {
    const { data, error } = await supabase.rpc("update_task_status", {
      p_task_id: taskId,
      p_new_status: newStatus,
    });

    if (error) {
      console.error("Error updating task status:", error);
      throw error;
    }

    const result = data as { success: boolean; message: string };
    if (!result.success) {
      throw new Error(result.message);
    }

    return result as unknown as DeliveryTask;
  } catch (error) {
    console.error("updateTaskStatus error:", error);
    throw error;
  }
};

/**
 * Fetch courier's task history (completed deliveries)
 */
export const fetchCourierTaskHistory = async (): Promise<DeliveryTask[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error("Нэвтрээгүй байна");
    }

    const { data, error } = await supabase
      .from("delivery_tasks")
      .select("*")
      .eq("courier_id", session.user.id)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching task history:", error);
      throw error;
    }

    return (data as DeliveryTask[]) || [];
  } catch (error) {
    console.error("fetchCourierTaskHistory error:", error);
    throw error;
  }
};

/**
 * Fetch courier tasks for the earnings/performance dashboard.
 * Includes delivered, pending, assigned, and cancelled tasks claimed by the courier.
 */
export const fetchCourierDashboardTasks = async (): Promise<
  CourierDashboardTask[]
> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error("Нэвтрээгүй байна");
    }

    const { data, error } = await supabase
      .from("delivery_tasks")
      .select("*")
      .eq("courier_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching courier dashboard tasks:", error);
      throw error;
    }

    return ((data as CourierDashboardTaskRow[] | null) ?? []).map(
      mapDashboardTaskRow,
    );
  } catch (error) {
    console.error("fetchCourierDashboardTasks error:", error);
    throw error;
  }
};

/**
 * Transition a task from 'picked_up' → 'delivered' and generate a 6-digit OTP.
 * Calls the generate_epod_otp() RPC which:
 *   1. Updates status to 'delivered'
 *   2. Stores a bcrypt-hashed OTP with 10-min expiry
 *   3. Returns the plain OTP + receiver email
 */
export const markDeliveredAndRequestOtp = async (
  taskId: string,
): Promise<{ success: boolean; warning?: string }> => {
  try {
    // 1. Call RPC to update status → 'delivered' and generate OTP
    const { data, error } = await supabase.rpc("generate_epod_otp", {
      p_task_id: taskId,
    });

    if (error) {
      console.error("generate_epod_otp error:", error);
      throw new Error(error.message || "OTP үүсгэхэд алдаа гарлаа");
    }

    const result = data as {
      success?: boolean;
      message?: string;
      otp_plain?: string;
      customer_email?: string;
    } | null;

    if (!result?.success) {
      const msg = result?.message || "OTP үүсгэхэд алдаа гарлаа";
      console.error("generate_epod_otp failed:", msg);
      throw new Error(msg);
    }

    // 2. Send OTP email via Edge Function (fire-and-forget — don't await)
    supabase.functions
      .invoke("send-otp-email", {
        body: {
          task_id: taskId,
          otp_plain: result.otp_plain,
          customer_email: result.customer_email,
        },
      })
      .catch((emailErr) =>
        console.warn("OTP email send failed (non-blocking):", emailErr),
      );

    const warning = result.customer_email
      ? `OTP код ${result.customer_email} хаяг руу илгээгдэнэ`
      : "OTP код үүсгэгдлээ";

    return { success: true, warning };
  } catch (error) {
    console.error("markDeliveredAndRequestOtp error:", error);
    throw error;
  }
};

/**
 * Re-send OTP for a task already in 'delivered' state (e.g. code expired).
 */
export const resendEpodOtp = async (
  taskId: string,
): Promise<{ success: boolean; warning?: string }> => {
  try {
    const { data, error } = await supabase.rpc("resend_epod_otp", {
      p_task_id: taskId,
    });

    if (error) {
      console.error("resend_epod_otp error:", error);
      throw new Error(error.message || "OTP дахин илгээхэд алдаа гарлаа");
    }

    const result = data as {
      success?: boolean;
      message?: string;
      otp_plain?: string;
      customer_email?: string;
    } | null;

    if (!result?.success) {
      const msg = result?.message || "OTP дахин илгээхэд алдаа гарлаа";
      console.error("resend_epod_otp failed:", msg);
      throw new Error(msg);
    }

    // Send email via Edge Function (fire-and-forget — don't await)
    supabase.functions
      .invoke("send-otp-email", {
        body: {
          task_id: taskId,
          otp_plain: result.otp_plain,
          customer_email: result.customer_email,
        },
      })
      .catch((emailErr) =>
        console.warn("OTP resend email failed (non-blocking):", emailErr),
      );

    const warning = result.customer_email
      ? `OTP код ${result.customer_email} хаяг руу дахин илгээгдлээ`
      : "OTP код дахин үүсгэгдлээ";

    return { success: true, warning };
  } catch (error) {
    console.error("resendEpodOtp error:", error);
    throw error;
  }
};

/**
 * Verify the ePOD OTP entered by the courier.
 * On success the task transitions 'delivered' → 'completed' and
 * a courier_earnings record is inserted.
 */
export const verifyEpodOtp = async (
  taskId: string,
  otp: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("[verifyEpodOtp] calling RPC with taskId:", taskId);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_epod_otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ p_task_id: taskId, p_otp: otp }),
    });

    console.log("[verifyEpodOtp] fetch status:", res.status);
    const result = await res.json();
    console.log("[verifyEpodOtp] fetch response:", result);

    if (!res.ok) {
      throw new Error(result?.message || result?.error || `HTTP ${res.status}`);
    }

    return {
      success: result?.success ?? false,
      message: result?.message ?? "Хариу ирсэнгүй",
    };
  } catch (error) {
    console.error("verifyEpodOtp error:", error);
    throw error;
  }
};

/**
 * Real-time subscription to available tasks
 * Subscribe to changes in the available_tasks table
 */
export const subscribeToAvailableTasks = (
  callback: (tasks: AvailableTask[]) => void,
) => {
  const subscription = supabase
    .channel("available_tasks_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "available_tasks",
      },
      async () => {
        // Refetch tasks when any change occurs
        const tasks = await fetchAvailableTasks();
        callback(tasks);
      },
    )
    .subscribe();

  return subscription;
};
