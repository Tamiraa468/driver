/**
 * useAvailableTasks Hook
 *
 * Fetches available delivery tasks from Supabase with:
 * - Auto-refresh on screen focus
 * - Pull-to-refresh support
 * - Real-time subscription
 * - Loading, error, and empty states
 * - RLS-safe with clear debug logging
 */

import { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../config/supabaseClient";
import { AvailableTask } from "../types/order";

interface UseAvailableTasksReturn {
  tasks: AvailableTask[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Manually reload the task list */
  refresh: () => Promise<void>;
  /** Pull-to-refresh handler (sets refreshing state) */
  onRefresh: () => Promise<void>;
  /** Claim a task by ID; returns { success, message } */
  claimTask: (taskId: string) => Promise<{ success: boolean; message: string }>;
  /** The task currently being claimed (or null) */
  claimingTaskId: string | null;
}

const TAG = "[useAvailableTasks]";

export function useAvailableTasks(): UseAvailableTasksReturn {
  const [tasks, setTasks] = useState<AvailableTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMounted = useRef(true);

  // ── Fetch ────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      // First confirm auth status (debug helper)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn(`${TAG} Not authenticated — cannot fetch tasks`);
        setError("You must be logged in to view tasks.");
        setTasks([]);
        return;
      }

      console.log(`${TAG} Fetching tasks as user=${user.id}`);

      // Try RPC first (includes location addresses)
      const { data, error: rpcErr } = await supabase.rpc(
        "get_available_tasks",
        { p_limit: 50, p_offset: 0 },
      );

      if (rpcErr) {
        console.error(`${TAG} RPC error:`, rpcErr);

        // RPC might not exist — fallback to direct table query
        if (
          rpcErr.message.includes("Could not find the function") ||
          rpcErr.code === "PGRST202"
        ) {
          console.warn(`${TAG} RPC not found — falling back to direct query`);
          await fetchDirect();
          return;
        }

        // RLS or permission error
        if (rpcErr.code === "42501" || rpcErr.message.includes("permission")) {
          const msg =
            "RLS blocked the query. Check:\n" +
            "1. Run: SELECT is_approved_courier(); in SQL editor\n" +
            "2. Verify your profile status = 'approved'\n" +
            "3. Ensure GRANT EXECUTE on get_available_tasks TO authenticated";
          console.error(`${TAG} RLS issue:`, msg);
          setError("Хандах эрх хүрэлцэхгүй байна. Админтай холбогдоно уу.");
          return;
        }

        setError(rpcErr.message);
        return;
      }

      const taskList = (data as AvailableTask[]) || [];
      console.log(`${TAG} Fetched ${taskList.length} tasks`);
      if (isMounted.current) {
        setTasks(taskList);
        setError(null);
      }
    } catch (err: any) {
      console.error(`${TAG} Unexpected error:`, err);
      if (isMounted.current) {
        setError(err?.message || "Failed to load tasks");
      }
    }
  }, []);

  /** Direct table fallback (no location addresses) */
  const fetchDirect = async () => {
    const { data, error: tblErr } = await supabase
      .from("available_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tblErr) {
      console.error(`${TAG} Direct query error:`, tblErr);

      if (tblErr.code === "42501") {
        setError(
          "RLS blocked direct query. Run in SQL editor:\n" +
            "GRANT SELECT ON available_tasks TO authenticated;",
        );
      } else if (tblErr.code === "PGRST204" || tblErr.code === "42P01") {
        setError(
          "Table 'available_tasks' does not exist. " +
            "Run the migration: 20250301000001_fix_available_tasks_rls.sql",
        );
      } else {
        setError(tblErr.message);
      }
      return;
    }

    const taskList: AvailableTask[] = (data || []).map((item: any) => ({
      task_id: item.task_id ?? item.id,
      order_id: item.order_id,
      pickup_location_id: item.pickup_location_id,
      dropoff_location_id: item.dropoff_location_id,
      pickup_address: item.pickup_address ?? null,
      dropoff_address: item.dropoff_address ?? null,
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

    console.log(`${TAG} Direct query: ${taskList.length} tasks`);
    if (isMounted.current) {
      setTasks(taskList);
      setError(null);
    }
  };

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      setLoading(true);
      await fetchTasks();
      if (isMounted.current) setLoading(false);
    })();
    return () => {
      isMounted.current = false;
    };
  }, [fetchTasks]);

  // ── Real-time subscription ───────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("available_tasks_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_tasks" },
        () => {
          console.log(`${TAG} Realtime change detected — refetching`);
          fetchTasks();
        },
      )
      .subscribe((status) => {
        console.log(`${TAG} Realtime subscription status:`, status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [fetchTasks]);

  // ── App foreground refetch ───────────────────────────────
  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next === "active") {
        console.log(`${TAG} App foregrounded — refetching`);
        fetchTasks();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [fetchTasks]);

  // ── Refresh handlers ────────────────────────────────────
  const refresh = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    if (isMounted.current) setRefreshing(false);
  }, [fetchTasks]);

  // ── Claim task ──────────────────────────────────────────
  const claimTask = useCallback(
    async (taskId: string) => {
      try {
        setClaimingTaskId(taskId);

        console.log(`${TAG} Claiming task=${taskId} via RPC`);

        const { data, error: claimErr } = await supabase.rpc(
          "claim_delivery_task",
          { p_task_id: taskId },
        );

        if (claimErr) {
          console.error(`${TAG} Claim RPC error:`, claimErr);
          return { success: false, message: claimErr.message };
        }

        const result = data as {
          success: boolean;
          message: string;
          task_id: string;
        };

        console.log(`${TAG} Claim result:`, result);

        if (result.success) {
          // Optimistic remove
          setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
        } else {
          // Refresh list
          await fetchTasks();
        }

        return { success: result.success, message: result.message };
      } catch (err: any) {
        console.error(`${TAG} Claim error:`, err);
        return { success: false, message: err?.message || "Claim failed" };
      } finally {
        if (isMounted.current) setClaimingTaskId(null);
      }
    },
    [fetchTasks],
  );

  return {
    tasks,
    loading,
    refreshing,
    error,
    refresh,
    onRefresh,
    claimTask,
    claimingTaskId,
  };
}
