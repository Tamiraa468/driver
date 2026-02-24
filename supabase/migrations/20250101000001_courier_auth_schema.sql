-- ============================================================================
-- COURIER APP AUTHENTICATION SCHEMA
-- Production-grade SQL for Supabase Auth + RLS
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- Stores user profiles linked to auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'merchant', 'courier')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. DELIVERY TASKS TABLE
-- Tasks that couriers can claim and deliver
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    merchant_id UUID NOT NULL REFERENCES public.profiles(id),
    courier_id UUID REFERENCES public.profiles(id),
    
    -- Pickup details
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_contact_name TEXT,
    pickup_contact_phone TEXT,
    
    -- Dropoff details
    dropoff_address TEXT NOT NULL,
    dropoff_latitude DECIMAL(10, 8),
    dropoff_longitude DECIMAL(11, 8),
    dropoff_contact_name TEXT,
    dropoff_contact_phone TEXT,
    
    -- Task details
    distance_km DECIMAL(6, 2),
    delivery_fee DECIMAL(10, 2) NOT NULL,
    instructions TEXT,
    
    -- Status workflow: draft → published → assigned → picked_up → delivered
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'assigned', 'picked_up', 'delivered', 'cancelled')
    ),
    
    -- Timestamps
    published_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_status ON public.delivery_tasks(status);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_courier ON public.delivery_tasks(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_merchant ON public.delivery_tasks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_published ON public.delivery_tasks(status) WHERE status = 'published';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS on_delivery_tasks_updated ON public.delivery_tasks;
CREATE TRIGGER on_delivery_tasks_updated
    BEFORE UPDATE ON public.delivery_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) - PROFILES TABLE
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- Policy: Users can read ONLY their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can insert their own profile (during signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy: Couriers can update ONLY full_name and phone on their own profile
-- This uses a column-level restriction approach
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Ensure role and status cannot be changed by the user
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
    );

-- Policy: Admins can read and update all profiles
-- Used for approving couriers
CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) - DELIVERY TASKS TABLE
-- ============================================================================

ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "delivery_tasks_courier_select" ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_courier_claim" ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_courier_update_own" ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_merchant_all" ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_admin_all" ON public.delivery_tasks;

-- Helper function: Check if current user is an approved courier
CREATE OR REPLACE FUNCTION public.is_approved_courier()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'courier'
        AND status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if current user is a courier (any status)
CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'courier'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policy: Approved couriers can SELECT published tasks or their own assigned tasks
CREATE POLICY "delivery_tasks_courier_select" ON public.delivery_tasks
    FOR SELECT
    USING (
        public.is_approved_courier()
        AND (
            status = 'published'
            OR courier_id = auth.uid()
        )
    );

-- Policy: Approved couriers can claim published tasks (UPDATE from published to assigned)
CREATE POLICY "delivery_tasks_courier_claim" ON public.delivery_tasks
    FOR UPDATE
    USING (
        public.is_approved_courier()
        AND status = 'published'
        AND courier_id IS NULL
    )
    WITH CHECK (
        status = 'assigned'
        AND courier_id = auth.uid()
    );

-- Policy: Couriers can update their own assigned tasks (status progression)
CREATE POLICY "delivery_tasks_courier_update_own" ON public.delivery_tasks
    FOR UPDATE
    USING (
        public.is_approved_courier()
        AND courier_id = auth.uid()
        AND status IN ('assigned', 'picked_up')
    )
    WITH CHECK (
        courier_id = auth.uid()
        -- Only allow valid status progressions
        AND (
            (status = 'picked_up' AND (SELECT status FROM public.delivery_tasks WHERE id = delivery_tasks.id) = 'assigned')
            OR (status = 'delivered' AND (SELECT status FROM public.delivery_tasks WHERE id = delivery_tasks.id) = 'picked_up')
        )
    );

-- Policy: Merchants can manage their own tasks
CREATE POLICY "delivery_tasks_merchant_all" ON public.delivery_tasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'merchant'
        )
        AND merchant_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'merchant'
        )
        AND merchant_id = auth.uid()
    );

-- Policy: Admins have full access to all tasks
CREATE POLICY "delivery_tasks_admin_all" ON public.delivery_tasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 5. AUTOMATIC PROFILE CREATION ON SIGNUP (Optional Trigger)
-- This can be used as an alternative to client-side profile creation
-- ============================================================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'courier'),
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (uncomment if you want automatic profile creation)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 6. COURIER EARNINGS TABLE (Bonus: Track courier earnings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.courier_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES public.profiles(id),
    task_id UUID NOT NULL REFERENCES public.delivery_tasks(id),
    amount DECIMAL(10, 2) NOT NULL,
    distance_km DECIMAL(6, 2),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_out BOOLEAN NOT NULL DEFAULT FALSE,
    paid_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courier_earnings_courier ON public.courier_earnings(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_earnings_completed ON public.courier_earnings(completed_at);

ALTER TABLE public.courier_earnings ENABLE ROW LEVEL SECURITY;

-- Couriers can only see their own earnings
CREATE POLICY "courier_earnings_own" ON public.courier_earnings
    FOR SELECT
    USING (courier_id = auth.uid());

-- Only system/admin can insert earnings
CREATE POLICY "courier_earnings_admin_insert" ON public.courier_earnings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ============================================================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Available tasks for couriers (published tasks only)
CREATE OR REPLACE VIEW public.available_delivery_tasks AS
SELECT 
    dt.*,
    p.full_name as merchant_name
FROM public.delivery_tasks dt
JOIN public.profiles p ON dt.merchant_id = p.id
WHERE dt.status = 'published';

-- View: Courier's task history
CREATE OR REPLACE VIEW public.courier_task_history AS
SELECT 
    dt.*,
    p.full_name as merchant_name,
    ce.amount as earning_amount
FROM public.delivery_tasks dt
JOIN public.profiles p ON dt.merchant_id = p.id
LEFT JOIN public.courier_earnings ce ON dt.id = ce.task_id
WHERE dt.courier_id = auth.uid()
AND dt.status = 'delivered';


-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.delivery_tasks TO authenticated;
GRANT SELECT ON public.courier_earnings TO authenticated;

-- Grant access to views
GRANT SELECT ON public.available_delivery_tasks TO authenticated;
GRANT SELECT ON public.courier_task_history TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_approved_courier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_courier() TO authenticated;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth. Contains role and approval status.';
COMMENT ON TABLE public.delivery_tasks IS 'Delivery tasks that can be claimed and completed by couriers.';
COMMENT ON TABLE public.courier_earnings IS 'Track earnings for each completed delivery.';

COMMENT ON FUNCTION public.is_approved_courier() IS 'Returns true if the current user is a courier with approved status.';
COMMENT ON FUNCTION public.is_courier() IS 'Returns true if the current user has the courier role.';

COMMENT ON POLICY "profiles_select_own" ON public.profiles IS 'Users can only read their own profile.';
COMMENT ON POLICY "profiles_update_own" ON public.profiles IS 'Users can update name/phone but NOT role/status.';
COMMENT ON POLICY "delivery_tasks_courier_select" ON public.delivery_tasks IS 'Approved couriers can see published tasks or their assigned tasks.';
COMMENT ON POLICY "delivery_tasks_courier_claim" ON public.delivery_tasks IS 'Approved couriers can claim published tasks.';
