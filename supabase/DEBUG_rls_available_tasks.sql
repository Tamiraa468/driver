-- ============================================================================
-- RLS DEBUG CHECKLIST for available_tasks
-- Run these queries in Supabase SQL Editor to diagnose access issues.
-- ============================================================================

-- ─── Step 1: Check if your user exists and has correct role/status ──────────
-- Replace 'YOUR_EMAIL' with the courier's email
SELECT id, email, role, status, full_name
FROM public.profiles
WHERE email = 'YOUR_EMAIL';
-- Expected: role = 'courier', status = 'approved'
-- If status != 'approved', couriers CANNOT see tasks (by design)

-- ─── Step 2: Check auth.uid() resolves correctly ───────────────────────────
-- (Run this while authenticated as the courier via Supabase client)
SELECT auth.uid() AS current_user_id;

-- ─── Step 3: Verify the helper functions exist ─────────────────────────────
SELECT
  proname AS function_name,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname IN ('is_courier', 'is_approved_courier', 'is_admin', 'get_available_tasks', 'claim_delivery_task')
ORDER BY proname;
-- Expected: all 5 functions listed, is_security_definer = true

-- ─── Step 4: Test is_approved_courier() directly ───────────────────────────
SELECT public.is_approved_courier() AS am_i_approved;
-- Expected: true (if you're logged in as an approved courier)

-- ─── Step 5: Check if delivery_tasks has any published rows ────────────────
-- (bypass RLS for admin check)
SELECT id, status, courier_id, delivery_fee, created_at
FROM public.delivery_tasks
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 10;
-- If 0 rows: there are simply no published tasks yet

-- ─── Step 6: Test the RPC directly ─────────────────────────────────────────
SELECT * FROM public.get_available_tasks(10, 0);
-- Expected: rows of published tasks if you're an approved courier

-- ─── Step 7: Test claim_delivery_task ──────────────────────────────────────
-- Replace 'TASK_UUID' with an actual task_id from Step 6
-- SELECT * FROM public.claim_delivery_task('TASK_UUID'::uuid);

-- ─── Step 8: Check RLS policies on delivery_tasks ──────────────────────────
SELECT
  polname AS policy_name,
  polcmd AS command,
  polpermissive AS permissive
FROM pg_policy
WHERE polrelid = 'public.delivery_tasks'::regclass
ORDER BY polname;
-- Expected policies:
--   dt_courier_select_published  (SELECT, permissive)
--   dt_courier_select_own        (SELECT, permissive)
--   dt_courier_claim             (UPDATE, permissive)
--   dt_courier_update_own        (UPDATE, permissive)
--   dt_admin_all                 (ALL, permissive)

-- ─── Step 9: Check GRANTs ──────────────────────────────────────────────────
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('delivery_tasks', 'available_tasks', 'profiles')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;
-- Expected: SELECT on available_tasks, SELECT+UPDATE on delivery_tasks

-- ─── Step 10: Verify the available_tasks view/table exists ─────────────────
SELECT table_type
FROM information_schema.tables
WHERE table_name = 'available_tasks'
  AND table_schema = 'public';
-- Expected: 'VIEW' or 'BASE TABLE'

-- ============================================================================
-- QUICK FIX: If is_approved_courier() doesn't exist, create it:
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.is_approved_courier()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'courier'
      AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_approved_courier() TO authenticated;
*/

-- ============================================================================
-- QUICK FIX: If you need to manually approve a courier for testing:
-- ============================================================================
/*
UPDATE public.profiles
SET status = 'approved'
WHERE email = 'YOUR_EMAIL' AND role = 'courier';
*/
