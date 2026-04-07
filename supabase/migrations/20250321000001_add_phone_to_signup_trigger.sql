-- ============================================================================
-- Add Phone Field Support to Auth Signup Trigger
-- Updates handle_new_user() to extract and store phone from user metadata
-- ============================================================================

-- Update the signup trigger to include phone field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app TEXT;
  _role TEXT;
  _name TEXT;
  _phone TEXT;
BEGIN
  -- Extract metadata
  _app  := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'app'), '');
  _name := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), '');
  _phone := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'phone'), '');

  -- Deterministic mapping (with safe fallback)
  CASE _app
    WHEN 'courier_app'     THEN _role := 'courier';
    WHEN 'merchant_portal'  THEN _role := 'org_user';
    WHEN 'customer_app'     THEN _role := 'customer';
    ELSE
      -- Fallback to raw metadata role, or default
      _role := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data ->> 'role'), ''),
        'customer'
      );
  END CASE;

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role, status)
    VALUES (NEW.id, NEW.email, _name, _phone, _role, 'pending')
    ON CONFLICT (id) DO UPDATE
      SET role      = EXCLUDED.role,
          full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
          phone     = COALESCE(EXCLUDED.phone, public.profiles.phone);
  EXCEPTION
    WHEN OTHERS THEN
      -- Never block auth signup because of profile issues
      RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
  'Auth signup trigger - Extracts app, full_name, and phone from user metadata and creates/updates profile';
