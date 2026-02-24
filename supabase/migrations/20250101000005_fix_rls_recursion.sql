-- ============================================================================
-- FIX: infinite recursion in RLS policies for profiles table
-- The old policies did sub-SELECTs on profiles within their own policy check,
-- which triggers RLS evaluation again → infinite loop → 500 error.
-- Fix: use SECURITY DEFINER helper functions that bypass RLS.
-- ============================================================================

-- 1) SECURITY DEFINER helpers — bypass RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('org_user', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_courier()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'courier' AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'courier'
  );
$$;

-- 2) Drop ALL existing policies on profiles (some may be recursive)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- 3) Recreate policies — NO sub-selects on profiles, only helper functions
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_my_role()
  );

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());
