-- ============================================================================
-- FIX: Available Tasks RLS + Functions
-- Uses SECURITY DEFINER helpers from migration 005 to avoid recursion.
-- Ensures approved couriers can SELECT published tasks and their own tasks.
-- ============================================================================

-- 1) Ensure RLS is enabled on delivery_tasks
ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;

-- 2) Drop old courier policies (may use raw sub-SELECTs that trigger recursion)
DROP POLICY IF EXISTS "delivery_tasks_courier_select_published" ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_courier_select_own"       ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_courier_claim"            ON public.delivery_tasks;
DROP POLICY IF EXISTS "courier_select_published"                ON public.delivery_tasks;
DROP POLICY IF EXISTS "courier_select_own"                      ON public.delivery_tasks;
DROP POLICY IF EXISTS "courier_update_own"                      ON public.delivery_tasks;

-- 3) Recreate using SECURITY DEFINER helpers (is_approved_courier, is_courier, is_admin)

-- Approved couriers can see published (unclaimed) tasks
CREATE POLICY "dt_courier_select_published" ON public.delivery_tasks
  FOR SELECT
  USING (
    status = 'published'
    AND public.is_approved_courier()
  );

-- Couriers can see their own assigned/picked_up/delivered tasks
CREATE POLICY "dt_courier_select_own" ON public.delivery_tasks
  FOR SELECT
  USING (
    courier_id = auth.uid()
    AND public.is_courier()
  );

-- Couriers can claim published tasks (UPDATE published → assigned)
CREATE POLICY "dt_courier_claim" ON public.delivery_tasks
  FOR UPDATE
  USING (
    status = 'published'
    AND courier_id IS NULL
    AND public.is_approved_courier()
  )
  WITH CHECK (
    status = 'assigned'
    AND courier_id = auth.uid()
  );

-- Couriers can update their own tasks (e.g. picked_up → delivered)
CREATE POLICY "dt_courier_update_own" ON public.delivery_tasks
  FOR UPDATE
  USING (
    courier_id = auth.uid()
    AND public.is_approved_courier()
  )
  WITH CHECK (
    courier_id = auth.uid()
  );

-- Admins / org_users can do anything on delivery_tasks
CREATE POLICY "dt_admin_all" ON public.delivery_tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4) Grants
GRANT SELECT, UPDATE ON public.delivery_tasks TO authenticated;
GRANT SELECT ON public.available_tasks TO authenticated;

-- 5) Recreate get_available_tasks with SECURITY DEFINER (bypasses RLS)
DROP FUNCTION IF EXISTS public.get_available_tasks(INT, INT);

CREATE OR REPLACE FUNCTION public.get_available_tasks(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    task_id UUID,
    order_id UUID,
    pickup_location_id UUID,
    dropoff_location_id UUID,
    pickup_address TEXT,
    dropoff_address TEXT,
    pickup_note TEXT,
    dropoff_note TEXT,
    note TEXT,
    package_value NUMERIC,
    delivery_fee NUMERIC,
    suggested_fee NUMERIC,
    receiver_name TEXT,
    receiver_phone TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Guard: only approved couriers
    IF NOT public.is_approved_courier() THEN
        RETURN; -- empty result set
    END IF;

    RETURN QUERY
    SELECT 
        dt.id          AS task_id,
        dt.order_id,
        dt.pickup_location_id,
        dt.dropoff_location_id,
        pl.address     AS pickup_address,
        dl.address     AS dropoff_address,
        dt.pickup_note,
        dt.dropoff_note,
        dt.note,
        dt.package_value,
        dt.delivery_fee,
        dt.suggested_fee,
        dt.receiver_name,
        dt.receiver_phone,
        dt.created_at
    FROM public.delivery_tasks dt
    LEFT JOIN public.locations pl ON dt.pickup_location_id = pl.id
    LEFT JOIN public.locations dl ON dt.dropoff_location_id = dl.id
    WHERE dt.status = 'published'
      AND dt.courier_id IS NULL
    ORDER BY dt.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_available_tasks(INT, INT) TO authenticated;

-- 6) Recreate claim_delivery_task with SECURITY DEFINER
DROP FUNCTION IF EXISTS public.claim_delivery_task(UUID);

CREATE OR REPLACE FUNCTION public.claim_delivery_task(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_courier_id UUID;
    v_current_status TEXT;
    v_success BOOLEAN DEFAULT FALSE;
    v_message TEXT;
BEGIN
    v_courier_id := auth.uid();

    -- Guard: must be approved courier
    IF NOT public.is_approved_courier() THEN
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
    ELSE
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_delivery_task(UUID) TO authenticated;
