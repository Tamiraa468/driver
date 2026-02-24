-- ============================================================================
-- 004: Deterministic role assignment from app metadata
--
-- Frontend sends raw_user_meta_data->>'app' (e.g. 'courier_app').
-- The DB trigger maps that to the correct role. Frontend CANNOT choose role.
-- ============================================================================

BEGIN;

-- 1) Normalize existing data before tightening constraints
UPDATE public.profiles
SET role = 'org_user'
WHERE role IS NULL OR role NOT IN ('org_user', 'courier', 'customer');

-- 2) Drop old CHECK + default, then add strict CHECK (no default)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('org_user', 'courier', 'customer'));

-- 3) Trigger function: map app metadata → role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app  TEXT;
  _role TEXT;
  _name TEXT;
BEGIN
  _app  := NEW.raw_user_meta_data ->> 'app';
  _name := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), '');

  -- Deterministic mapping (with safe fallback)
  CASE _app
    WHEN 'courier_app'     THEN _role := 'courier';
    WHEN 'merchant_portal'  THEN _role := 'org_user';
    WHEN 'customer_app'     THEN _role := 'customer';
    ELSE
      -- Log but do not block signup; fall back to org_user
      RAISE WARNING 'Unknown app identifier: "%" for user %. Defaulting to org_user.', _app, NEW.id;
      _role := 'org_user';
  END CASE;

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, status)
    VALUES (NEW.id, NEW.email, _name, _role, 'pending')
    ON CONFLICT (id) DO UPDATE
      SET role      = EXCLUDED.role,
          full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  EXCEPTION
    WHEN OTHERS THEN
      -- Never block auth signup because of profile issues
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

-- 4) RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON public.profiles;

-- Select own row
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Insert own row (trigger handles this, but keep for direct inserts)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Update own row, role must stay unchanged
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Admin full access
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'org_user'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'org_user'));

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

COMMIT;

-- ============================================================================
-- TEST: Confirm last 10 courier_app signups have role = 'courier'
-- ============================================================================
-- SELECT p.id, p.role, u.raw_user_meta_data->>'app' AS app, u.created_at
-- FROM auth.users u
-- JOIN public.profiles p ON p.id = u.id
-- WHERE u.raw_user_meta_data->>'app' = 'courier_app'
-- ORDER BY u.created_at DESC
-- LIMIT 10;
