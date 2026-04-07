-- ============================================================================
-- FIX: Drop ALL delivery_tasks policies and recreate without self-references
-- Resolves: "infinite recursion detected in policy for relation delivery_tasks"
--
-- Root cause: The original "delivery_tasks_courier_update_own" policy contained
-- a sub-SELECT on the same table inside WITH CHECK, which PostgreSQL flags as
-- infinite recursion when evaluating RLS.
-- ============================================================================

-- 1) Drop every known policy on delivery_tasks
DROP POLICY IF EXISTS "delivery_tasks_courier_select"        ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_courier_update_own"    ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_courier_claim"         ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_merchant_all"          ON public.delivery_tasks;
DROP POLICY IF EXISTS "delivery_tasks_admin_all"             ON public.delivery_tasks;
DROP POLICY IF EXISTS "dt_courier_select_published"          ON public.delivery_tasks;
DROP POLICY IF EXISTS "dt_courier_select_own"                ON public.delivery_tasks;
DROP POLICY IF EXISTS "dt_courier_claim"                     ON public.delivery_tasks;
DROP POLICY IF EXISTS "dt_courier_update_own"                ON public.delivery_tasks;
DROP POLICY IF EXISTS "dt_admin_all"                         ON public.delivery_tasks;

-- 2) Ensure RLS is on
ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;

-- 3) SELECT: approved couriers see published tasks + their own tasks
CREATE POLICY "dt_courier_select" ON public.delivery_tasks
  FOR SELECT
  USING (
    public.is_approved_courier()
    AND (
      status = 'published'
      OR courier_id = auth.uid()
    )
  );

-- 4) UPDATE – claim: courier claims a published task (published → assigned)
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

-- 5) UPDATE – own tasks: courier progresses status on tasks they own
--    No sub-SELECT on delivery_tasks — just check the new row values.
CREATE POLICY "dt_courier_update_own" ON public.delivery_tasks
  FOR UPDATE
  USING (
    courier_id = auth.uid()
    AND public.is_approved_courier()
    AND status IN ('assigned', 'picked_up', 'delivered')
  )
  WITH CHECK (
    courier_id = auth.uid()
  );

-- 6) Admins can do anything
CREATE POLICY "dt_admin_all" ON public.delivery_tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7) Grants (idempotent)
GRANT SELECT, UPDATE ON public.delivery_tasks TO authenticated;
