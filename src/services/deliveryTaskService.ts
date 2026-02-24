import { supabase } from "../config/supabaseClient";
import { AvailableTask, ClaimTaskResponse, DeliveryTask } from "../types/order";

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
 */
export const fetchCourierAssignedTasks = async (): Promise<DeliveryTask[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("delivery_tasks")
      .select("*")
      .eq("courier_id", user.id)
      .in("status", ["assigned", "picked_up"])
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
 * Update task status (for courier workflow: assigned → picked_up → delivered)
 */
export const updateTaskStatus = async (
  taskId: string,
  newStatus: "picked_up" | "delivered",
): Promise<DeliveryTask> => {
  try {
    const updateData: any = {
      status: newStatus,
    };

    // Add timestamp for status change
    if (newStatus === "picked_up") {
      updateData.picked_up_at = new Date().toISOString();
    } else if (newStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("delivery_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating task status:", error);
      throw error;
    }

    return data as DeliveryTask;
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("delivery_tasks")
      .select("*")
      .eq("courier_id", user.id)
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
