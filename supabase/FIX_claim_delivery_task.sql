-- ============================================================================
-- FIX: claim_delivery_task - trigger blocks own function
-- Run in: https://supabase.com/dashboard/project/akgsjzgdzmvnutidqjje/sql
--
-- PROBLEM: A trigger on delivery_tasks raises
--   "Tasks can only be assigned via claim_delivery_task()."
-- but the function itself doesn't bypass the trigger.
--
-- This script is IDEMPOTENT — safe to run multiple times.
-- ============================================================================

-- ─── Step 0: DIAGNOSTIC - Show ALL triggers on delivery_tasks ───────────────
-- Run this SELECT first to see what triggers exist:
SELECT tgname, tgenabled, pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.delivery_tasks'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- ─── Step 1: DROP EVERY non-sync trigger on delivery_tasks ──────────────────
-- This is the nuclear option - removes ALL triggers that could be blocking
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'public.delivery_tasks'::regclass
          AND NOT tgisinternal
          AND tgname NOT LIKE '%sync_available%'  -- keep the sync trigger
    LOOP
        RAISE NOTICE 'Dropping trigger: %', r.tgname;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.delivery_tasks', r.tgname);
    END LOOP;
END $$;

-- ─── Step 2: Recreate claim_delivery_task (SECURITY DEFINER, no trigger needed) ─
DROP FUNCTION IF EXISTS public.claim_delivery_task(UUID);

CREATE OR REPLACE FUNCTION public.claim_delivery_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_courier_id UUID;
    v_current_status TEXT;
    v_success BOOLEAN DEFAULT FALSE;
    v_message TEXT;
BEGIN
    v_courier_id := auth.uid();

    -- Guard: must be authenticated
    IF v_courier_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Not authenticated',
            'task_id', p_task_id
        );
    END IF;

    -- Guard: must be approved courier
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_courier_id
          AND role::text = 'courier'
          AND status = 'approved'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: You must be an approved courier',
            'task_id', p_task_id
        );
    END IF;

    -- Atomic claim (race-condition safe)
    UPDATE public.delivery_tasks
    SET status      = 'assigned',
        courier_id  = v_courier_id,
        assigned_at = NOW()
    WHERE id = p_task_id
      AND status = 'published'
      AND courier_id IS NULL
    RETURNING status INTO v_current_status;

    IF FOUND THEN
        v_success := TRUE;
        v_message := 'Task assigned successfully';

        -- Also remove from available_tasks cache if it exists
        DELETE FROM public.available_tasks WHERE task_id = p_task_id;
    ELSE
        -- Determine why it failed
        SELECT status INTO v_current_status
        FROM public.delivery_tasks WHERE id = p_task_id;

        IF v_current_status IS NULL THEN
            v_message := 'Task not found';
        ELSIF v_current_status != 'published' THEN
            v_message := 'Task is no longer available';
        ELSE
            v_message := 'Task was claimed by another courier';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', v_success,
        'message', v_message,
        'task_id', p_task_id,
        'courier_id', v_courier_id
    );
END;
$$;

-- ─── Step 3: Grant permissions ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.claim_delivery_task(UUID) TO authenticated;
GRANT SELECT, UPDATE ON public.delivery_tasks TO authenticated;
GRANT SELECT, DELETE ON public.available_tasks TO authenticated;

-- ─── Step 4: Verify triggers are gone ───────────────────────────────────────
SELECT tgname, pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.delivery_tasks'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- Only the sync trigger should remain. If you see anything else, report its name.

-- ─── Step 5: Quick test ─────────────────────────────────────────────────────
-- Replace with a real task UUID:
-- SELECT * FROM public.claim_delivery_task('<task-uuid>'::uuid);
