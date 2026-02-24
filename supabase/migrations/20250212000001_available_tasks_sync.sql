-- ============================================================================
-- AVAILABLE TASKS SYNC - Dedicated table for published delivery tasks
-- Production-optimized approach with trigger-based synchronization
-- ============================================================================

-- ============================================================================
-- 1. AVAILABLE_TASKS TABLE
-- Materialized view pattern: Sync only published tasks for fast courier queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.available_tasks (
    task_id UUID PRIMARY KEY REFERENCES public.delivery_tasks(id) ON DELETE CASCADE,
    org_id UUID NOT NULL, -- merchant_id for multi-tenant filtering
    
    -- Core delivery information
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_location_id UUID, -- Optional: Reference to locations table if exists
    
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10, 8),
    dropoff_longitude DECIMAL(11, 8),
    dropoff_location_id UUID, -- Optional: Reference to locations table if exists
    
    -- Package and payment details
    package_value DECIMAL(10, 2),
    delivery_fee DECIMAL(10, 2) NOT NULL,
    distance_km DECIMAL(6, 2),
    
    -- Additional info
    instructions TEXT,
    pickup_contact_name TEXT,
    pickup_contact_phone TEXT,
    dropoff_contact_name TEXT,
    dropoff_contact_phone TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimized courier queries
CREATE INDEX IF NOT EXISTS idx_available_tasks_created_at ON public.available_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_available_tasks_org ON public.available_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_available_tasks_location ON public.available_tasks(pickup_latitude, pickup_longitude);
CREATE INDEX IF NOT EXISTS idx_available_tasks_delivery_fee ON public.available_tasks(delivery_fee DESC);

-- Composite index for geospatial queries (if using location-based filtering)
CREATE INDEX IF NOT EXISTS idx_available_tasks_geo ON public.available_tasks(pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude);


-- ============================================================================
-- 2. SYNC TRIGGER FUNCTION
-- Automatically sync delivery_tasks → available_tasks
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_available_tasks()
RETURNS TRIGGER AS $$
BEGIN
    -- CASE 1: INSERT or UPDATE to 'published' status
    IF (TG_OP = 'INSERT' AND NEW.status = 'published') 
       OR (TG_OP = 'UPDATE' AND OLD.status != 'published' AND NEW.status = 'published') THEN
        
        -- Insert into available_tasks
        INSERT INTO public.available_tasks (
            task_id,
            org_id,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            pickup_location_id,
            dropoff_address,
            dropoff_latitude,
            dropoff_longitude,
            dropoff_location_id,
            package_value,
            delivery_fee,
            distance_km,
            instructions,
            pickup_contact_name,
            pickup_contact_phone,
            dropoff_contact_name,
            dropoff_contact_phone,
            created_at,
            published_at
        ) VALUES (
            NEW.id,
            NEW.merchant_id,
            NEW.pickup_address,
            NEW.pickup_latitude,
            NEW.pickup_longitude,
            NULL, -- pickup_location_id: Populate if you have a locations table
            NEW.dropoff_address,
            NEW.dropoff_latitude,
            NEW.dropoff_longitude,
            NULL, -- dropoff_location_id: Populate if you have a locations table
            NULL, -- package_value: Add column to delivery_tasks if needed
            NEW.delivery_fee,
            NEW.distance_km,
            NEW.instructions,
            NEW.pickup_contact_name,
            NEW.pickup_contact_phone,
            NEW.dropoff_contact_name,
            NEW.dropoff_contact_phone,
            NEW.created_at,
            COALESCE(NEW.published_at, NOW())
        )
        ON CONFLICT (task_id) DO NOTHING; -- Prevent duplicates
        
    -- CASE 2: UPDATE away from 'published' status (assigned, cancelled, etc.)
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status != 'published' THEN
        
        -- Remove from available_tasks
        DELETE FROM public.available_tasks
        WHERE task_id = NEW.id;
        
    -- CASE 3: DELETE published task
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
        
        -- Remove from available_tasks
        DELETE FROM public.available_tasks
        WHERE task_id = OLD.id;
        
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_sync_available_tasks ON public.delivery_tasks;

-- Create trigger on delivery_tasks
CREATE TRIGGER trigger_sync_available_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.delivery_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_available_tasks();


-- ============================================================================
-- 3. ROW LEVEL SECURITY - AVAILABLE_TASKS
-- ============================================================================

ALTER TABLE public.available_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "available_tasks_courier_select" ON public.available_tasks;

-- Policy: Approved couriers can SELECT all available tasks
CREATE POLICY "available_tasks_courier_select" ON public.available_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'courier'
            AND status = 'approved'
        )
    );

-- No INSERT/UPDATE/DELETE policies: Only trigger should modify this table


-- ============================================================================
-- 4. RACE-CONDITION-SAFE CLAIM FUNCTION
-- Prevents multiple couriers from claiming the same task
-- ============================================================================

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
    
    -- Validate: User must be an approved courier
    IF NOT public.is_approved_courier() THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: You must be an approved courier',
            'task_id', p_task_id
        );
    END IF;
    
    -- Atomic update with WHERE conditions to prevent race conditions
    UPDATE public.delivery_tasks
    SET 
        status = 'assigned',
        courier_id = v_courier_id,
        assigned_at = NOW()
    WHERE id = p_task_id
      AND status = 'published' -- CRITICAL: Only claim if still published
      AND courier_id IS NULL    -- CRITICAL: Only claim if not already assigned
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
-- 5. HELPER FUNCTION: Get available tasks with full details
-- Returns enriched task data including merchant info
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_tasks(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    task_id UUID,
    pickup_address TEXT,
    pickup_lat DECIMAL,
    pickup_lng DECIMAL,
    dropoff_address TEXT,
    dropoff_lat DECIMAL,
    dropoff_lng DECIMAL,
    delivery_fee DECIMAL,
    distance_km DECIMAL,
    instructions TEXT,
    created_at TIMESTAMPTZ,
    merchant_name TEXT,
    merchant_phone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.task_id,
        at.pickup_address,
        at.pickup_latitude,
        at.pickup_longitude,
        at.dropoff_address,
        at.dropoff_latitude,
        at.dropoff_longitude,
        at.delivery_fee,
        at.distance_km,
        at.instructions,
        at.created_at,
        p.full_name as merchant_name,
        p.phone as merchant_phone
    FROM public.available_tasks at
    JOIN public.profiles p ON at.org_id = p.id
    WHERE public.is_approved_courier()
    ORDER BY at.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_available_tasks(INT, INT) TO authenticated;


-- ============================================================================
-- 6. INITIAL SYNC (Populate available_tasks from existing published tasks)
-- ============================================================================

-- Sync any existing published tasks
INSERT INTO public.available_tasks (
    task_id,
    org_id,
    pickup_address,
    pickup_latitude,
    pickup_longitude,
    dropoff_address,
    dropoff_latitude,
    dropoff_longitude,
    package_value,
    delivery_fee,
    distance_km,
    instructions,
    pickup_contact_name,
    pickup_contact_phone,
    dropoff_contact_name,
    dropoff_contact_phone,
    created_at,
    published_at
)
SELECT 
    id,
    merchant_id,
    pickup_address,
    pickup_latitude,
    pickup_longitude,
    dropoff_address,
    dropoff_latitude,
    dropoff_longitude,
    NULL, -- package_value
    delivery_fee,
    distance_km,
    instructions,
    pickup_contact_name,
    pickup_contact_phone,
    dropoff_contact_name,
    dropoff_contact_phone,
    created_at,
    COALESCE(published_at, NOW())
FROM public.delivery_tasks
WHERE status = 'published'
ON CONFLICT (task_id) DO NOTHING;


-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.available_tasks TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.available_tasks IS 'Materialized table containing only published delivery tasks. Auto-synced via trigger for optimal courier query performance.';
COMMENT ON FUNCTION public.sync_available_tasks() IS 'Trigger function that maintains available_tasks table in sync with delivery_tasks.status = published';
COMMENT ON FUNCTION public.claim_delivery_task(UUID) IS 'Race-condition-safe function for couriers to claim delivery tasks. Updates status atomically.';
COMMENT ON FUNCTION public.get_available_tasks(INT, INT) IS 'Returns available tasks with merchant details for courier app. Enforces courier role check.';

COMMENT ON POLICY "available_tasks_courier_select" ON public.available_tasks IS 'Only approved couriers can view available tasks.';
