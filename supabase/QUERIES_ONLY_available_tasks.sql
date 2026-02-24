-- ============================================================================
-- AVAILABLE TASKS - QUERIES ONLY (for existing VIEW)
-- Your available_tasks is already a VIEW, so no trigger/RLS needed
-- Just add the claim function and helper
-- ============================================================================

-- ============================================================================
-- 1. RLS POLICY - Apply to delivery_tasks (the underlying table)
-- Only approved couriers can see published tasks
-- ============================================================================

-- Enable RLS on delivery_tasks if not already enabled
ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing courier policies if any
DROP POLICY IF EXISTS "delivery_tasks_courier_select_published" ON public.delivery_tasks;

-- Couriers can see published tasks (available_tasks view will filter these)
CREATE POLICY "delivery_tasks_courier_select_published" ON public.delivery_tasks
    FOR SELECT
    USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'courier'
            AND status = 'approved'
        )
    );

-- Couriers can see their own assigned tasks
DROP POLICY IF EXISTS "delivery_tasks_courier_select_own" ON public.delivery_tasks;

CREATE POLICY "delivery_tasks_courier_select_own" ON public.delivery_tasks
    FOR SELECT
    USING (
        courier_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'courier'
            AND status = 'approved'
        )
    );

-- Couriers can UPDATE published tasks to claim them (assign to themselves)
DROP POLICY IF EXISTS "delivery_tasks_courier_claim" ON public.delivery_tasks;

CREATE POLICY "delivery_tasks_courier_claim" ON public.delivery_tasks
    FOR UPDATE
    USING (
        status = 'published'
        AND courier_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'courier'
            AND status = 'approved'
        )
    )
    WITH CHECK (
        status = 'assigned'
        AND courier_id = auth.uid()
    );


-- ============================================================================
-- 2. RACE-CONDITION-SAFE CLAIM FUNCTION
-- Prevents multiple couriers from claiming the same task
-- ============================================================================

-- Drop existing function if it exists (may have different return type)
DROP FUNCTION IF EXISTS public.claim_delivery_task(UUID);

CREATE OR REPLACE FUNCTION public.claim_delivery_task(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_courier_id UUID;
    v_current_status TEXT;
    v_success BOOLEAN DEFAULT FALSE;
    v_message TEXT;
BEGIN
    -- Get current user ID
    v_courier_id := auth.uid();
    
    -- Validate: Must be approved courier
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_courier_id
        AND role = 'courier'
        AND status = 'approved'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: You must be an approved courier',
            'task_id', p_task_id
        );
    END IF;
    
    -- Atomic update with WHERE conditions (RACE-CONDITION SAFE)
    UPDATE public.delivery_tasks
    SET 
        status = 'assigned',
        courier_id = v_courier_id,
        assigned_at = NOW()
    WHERE id = p_task_id
      AND status = 'published'     -- CRITICAL: Only if still published
      AND courier_id IS NULL        -- CRITICAL: Only if not already assigned
    RETURNING status INTO v_current_status;
    
    -- Check if update succeeded
    IF FOUND THEN
        v_success := TRUE;
        v_message := 'Task assigned successfully';
    ELSE
        -- Determine why it failed
        SELECT status INTO v_current_status
        FROM public.delivery_tasks
        WHERE id = p_task_id;
        
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.claim_delivery_task(UUID) TO authenticated;


-- ============================================================================
-- 3. HELPER FUNCTION - Get Available Tasks with Location Details
-- Joins with locations table and filters published tasks
-- ============================================================================

-- Drop existing function if it exists (may have different return type)
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
    RETURN QUERY
    SELECT 
        dt.id as task_id,
        dt.order_id,
        dt.pickup_location_id,
        dt.dropoff_location_id,
        pl.address as pickup_address,
        dl.address as dropoff_address,
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
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'courier'
        AND status = 'approved'
    )
    ORDER BY dt.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_available_tasks(INT, INT) TO authenticated;


-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

-- Grant access to delivery_tasks for couriers (via RLS policies)
GRANT SELECT, UPDATE ON public.delivery_tasks TO authenticated;

-- Grant access to your existing available_tasks view
GRANT SELECT ON public.available_tasks TO authenticated;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if functions exist
SELECT proname, proargnames, proargtypes::regtype[] 
FROM pg_proc 
WHERE proname IN ('get_available_tasks', 'claim_delivery_task');

-- Check RLS is enabled on delivery_tasks
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'delivery_tasks';

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'delivery_tasks' 
AND policyname LIKE '%courier%';

-- Check available tasks view
SELECT COUNT(*) FROM public.available_tasks;

-- Test get_available_tasks function (should work after running this SQL)
-- SELECT * FROM get_available_tasks(10, 0);

-- Test claim function (replace with real UUID)
-- SELECT claim_delivery_task('<task-uuid>');
