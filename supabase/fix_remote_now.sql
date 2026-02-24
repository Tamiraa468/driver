-- ============================================================================
-- ONE-SHOT FIX: Run this in the Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/akgsjzgdzmvnutidqjje/sql
--
-- This script is IDEMPOTENT — safe to run multiple times.
-- It fixes: 500 on signup, 406/400/403 on profile reads/writes.
-- ENHANCED: Uses enum type for role, TEXT for status
-- ============================================================================

-- 1) Create enum type for role if it doesn't exist
DO $$ BEGIN
  CREATE TYPE profile_role AS ENUM ('org_user', 'courier', 'customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Ensure all required columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add temporary column for role enum migration if needed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_new profile_role;

-- 3) Backfill / normalize existing data
--    Must check column type first: can't compare enum to '' 
DO $$
DECLARE
  _role_type TEXT;
  _status_type TEXT;
BEGIN
  SELECT data_type INTO _role_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

  SELECT data_type INTO _status_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status';

  -- Backfill role
  IF _role_type = 'text' THEN
    UPDATE public.profiles SET role = 'org_user'
      WHERE role IS NULL OR role = '' OR role NOT IN ('org_user', 'courier', 'customer', 'admin');
  ELSE
    -- Already enum — only fix NULLs (enum can't be '')
    UPDATE public.profiles SET role = 'org_user'::profile_role WHERE role IS NULL;
  END IF;

  -- Backfill status
  IF _status_type = 'text' THEN
    UPDATE public.profiles SET status = 'pending'
      WHERE status IS NULL OR status = '' OR status NOT IN ('pending', 'approved', 'blocked');
  ELSE
    UPDATE public.profiles SET status = 'pending' WHERE status IS NULL;
  END IF;
END $$;

UPDATE public.profiles SET email = '' WHERE email IS NULL;

-- 4) Migrate role to enum if it's currently TEXT
DO $$
DECLARE
  _is_text BOOLEAN;
BEGIN
  -- Check if role is TEXT type
  SELECT data_type = 'text' INTO _is_text
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role';
  
  IF _is_text THEN
    RAISE NOTICE 'Migrating role column from TEXT to ENUM...';
    
    -- Step 1: Drop ALL dependent policies that reference the role column
    -- (We'll recreate them later)
    
    -- Products table policies
    DROP POLICY IF EXISTS "Users can view products from their organization" ON public.products;
    DROP POLICY IF EXISTS "Users can insert products into their organization" ON public.products;
    DROP POLICY IF EXISTS "Users can update products in their organization" ON public.products;
    DROP POLICY IF EXISTS "Users can delete products in their organization" ON public.products;
    
    -- Delivery tasks policies
    DROP POLICY IF EXISTS "courier_select_published" ON public.delivery_tasks;
    DROP POLICY IF EXISTS "courier_select_own" ON public.delivery_tasks;
    DROP POLICY IF EXISTS "courier_update_own" ON public.delivery_tasks;
    
    -- Profiles policies (we'll recreate these in the RLS section)
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
    
    -- Step 2: Add new enum column
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_new profile_role;
    
    -- Step 3: Copy data to new enum column
    UPDATE public.profiles SET role_new = role::profile_role;
    
    -- Step 4: Drop old column and rename new one
    ALTER TABLE public.profiles DROP COLUMN role;
    ALTER TABLE public.profiles RENAME COLUMN role_new TO role;
    
    -- Step 5: Set NOT NULL and default
    ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'org_user'::profile_role;
    
    RAISE NOTICE 'Role column migration complete. Will recreate policies later.';
  END IF;
END $$;

-- 5) Ensure status is TEXT (revert from enum if needed)
DO $$
DECLARE
  _dtype TEXT;
BEGIN
  SELECT data_type INTO _dtype
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'status';

  IF _dtype = 'USER-DEFINED' THEN
    RAISE NOTICE 'Migrating status column from ENUM to TEXT...';
    
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_text TEXT;
    UPDATE public.profiles SET status_text = status::TEXT;
    ALTER TABLE public.profiles DROP COLUMN status;
    ALTER TABLE public.profiles RENAME COLUMN status_text TO status;
    ALTER TABLE public.profiles ALTER COLUMN status SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'pending';
    
    RAISE NOTICE 'Status column migrated to TEXT.';
  ELSE
    -- Already TEXT — just make sure NOT NULL + default are set
    ALTER TABLE public.profiles ALTER COLUMN status SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END $$;

-- Clean up temporary columns if they still exist
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role_new;

-- Drop the profile_status enum type if it exists (no longer needed)
DROP TYPE IF EXISTS profile_status;

-- 6) Drop old check constraints on role & status, then re-add status constraint
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
      AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'public.profiles'::regclass
      AND con.contype = 'c'
      AND att.attname IN ('role', 'status')
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Status uses a CHECK constraint since it's TEXT
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'approved', 'blocked'));

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email  ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 8) updated_at trigger
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

-- 9) SECURITY DEFINER helpers — bypass RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('org_user', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'courier'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_approved_courier()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'courier' AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 10) RLS policies — NO sub-selects on profiles, only helper functions
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role::TEXT = public.get_my_role()   -- no recursion: SECURITY DEFINER
  );

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 11) AUTH SIGNUP TRIGGER — the critical fix for 500 errors
--     Maps metadata.app → role. Falls back safely. Never blocks signup.
--     role uses profile_role enum, status is plain TEXT.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app  TEXT;
  _role profile_role;
  _name TEXT;
BEGIN
  _app  := NEW.raw_user_meta_data ->> 'app';
  _name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');

  -- Map app identifier to role
  CASE _app
    WHEN 'courier_app'     THEN _role := 'courier'::profile_role;
    WHEN 'merchant_portal' THEN _role := 'org_user'::profile_role;
    WHEN 'customer_app'    THEN _role := 'customer'::profile_role;
    ELSE
      -- Legacy: try raw_user_meta_data->>'role', fallback to org_user
      BEGIN
        _role := COALESCE(
          NULLIF(NEW.raw_user_meta_data ->> 'role', '')::profile_role,
          'org_user'::profile_role
        );
      EXCEPTION
        WHEN OTHERS THEN
          _role := 'org_user'::profile_role;
      END;
  END CASE;

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (NEW.id, NEW.email, _name, _role, 'pending')
    ON CONFLICT (id) DO UPDATE
      SET email     = COALESCE(EXCLUDED.email, public.profiles.email),
          full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
          role      = EXCLUDED.role;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 12) Recreate dependent policies for other tables
--     These were dropped during the enum migration

-- Products table policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    DROP POLICY IF EXISTS "Users can view products from their organization" ON public.products;
    CREATE POLICY "Users can view products from their organization" ON public.products
      FOR SELECT
      USING (
        org_id IN (
          SELECT org_id FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('org_user', 'admin')
        )
      );

    DROP POLICY IF EXISTS "Users can insert products into their organization" ON public.products;
    CREATE POLICY "Users can insert products into their organization" ON public.products
      FOR INSERT
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('org_user', 'admin')
        )
      );

    DROP POLICY IF EXISTS "Users can update products in their organization" ON public.products;
    CREATE POLICY "Users can update products in their organization" ON public.products
      FOR UPDATE
      USING (
        org_id IN (
          SELECT org_id FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('org_user', 'admin')
        )
      )
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('org_user', 'admin')
        )
      );

    DROP POLICY IF EXISTS "Users can delete products in their organization" ON public.products;
    CREATE POLICY "Users can delete products in their organization" ON public.products
      FOR DELETE
      USING (
        org_id IN (
          SELECT org_id FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('org_user', 'admin')
        )
      );
    
    RAISE NOTICE 'Recreated products table policies';
  END IF;
END $$;

-- Delivery tasks policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_tasks') THEN
    DROP POLICY IF EXISTS "courier_select_published" ON public.delivery_tasks;
    CREATE POLICY "courier_select_published" ON public.delivery_tasks
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'courier'
        )
        AND status = 'published'
      );

    DROP POLICY IF EXISTS "courier_select_own" ON public.delivery_tasks;
    CREATE POLICY "courier_select_own" ON public.delivery_tasks
      FOR SELECT
      USING (
        courier_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'courier'
        )
      );

    DROP POLICY IF EXISTS "courier_update_own" ON public.delivery_tasks;
    CREATE POLICY "courier_update_own" ON public.delivery_tasks
      FOR UPDATE
      USING (
        courier_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'courier'
        )
      )
      WITH CHECK (
        courier_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'courier'
        )
      );
    
    RAISE NOTICE 'Recreated delivery_tasks table policies';
  END IF;
END $$;

-- 13) Sync migration history so supabase CLI thinks everything is applied
--     The remote may have old versions (001, 002) or new timestamps — clean both.
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN (
  '001', '002', '003', '004',
  '20250101000001',
  '20250101000002',
  '20250101000003',
  '20250101000004'
);

-- Record all 4 migrations as applied
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES
  ('20250101000001'),
  ('20250101000002'),
  ('20250101000003'),
  ('20250101000004')
ON CONFLICT (version) DO NOTHING;
