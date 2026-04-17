-- ============================================================================
-- OPTIONAL COMPANION MIGRATION for the diploma security test suite.
--
-- Adds the 5-attempt lockout to verify_epod_otp() that the thesis claims
-- should exist. Apply this to your STAGING Supabase project (not production)
-- before running brute_force.ts if you want scenario A to demonstrate the
-- lockout behaviour empirically.
--
-- Apply via the Supabase SQL Editor or:
--   supabase db push --db-url "$STAGING_DB_URL"
--
-- Idempotent — re-running is safe.
-- ============================================================================

-- 1. Attempt counter + lockout timestamp on delivery_tasks.
ALTER TABLE public.delivery_tasks
  ADD COLUMN IF NOT EXISTS otp_attempts      INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_locked_until  TIMESTAMPTZ;

COMMENT ON COLUMN public.delivery_tasks.otp_attempts IS
  'Wrong-OTP attempt counter. Reset to 0 whenever a new OTP is generated.';
COMMENT ON COLUMN public.delivery_tasks.otp_locked_until IS
  'Wall-clock time at which verify_epod_otp unlocks after the 5-attempt cap.';


-- 2. Updated verify_epod_otp with lockout + counter.
CREATE OR REPLACE FUNCTION public.verify_epod_otp(p_task_id UUID, p_otp TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id UUID := auth.uid();
  v_task       RECORD;
  v_max_attempts CONSTANT INTEGER := 5;
  v_lock_window  CONSTANT INTERVAL := INTERVAL '15 minutes';
BEGIN
  SELECT * INTO v_task
  FROM   public.delivery_tasks
  WHERE  id         = p_task_id
    AND  courier_id = v_courier_id
    AND  status::text = 'delivered';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Даалгавар олдсонгүй эсвэл "delivered" төлөвт биш байна.',
      'code',    'NOT_FOUND'
    );
  END IF;

  -- 2a. Lock check — reject immediately without doing bcrypt work.
  IF v_task.otp_locked_until IS NOT NULL AND NOW() < v_task.otp_locked_until THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Хэт олон оролдлого. Шинэ OTP хүсч үргэлжлүүлнэ үү.',
      'code',    'LOCKED',
      'locked_until', v_task.otp_locked_until
    );
  END IF;

  -- 2b. Expiry.
  IF v_task.otp_expires_at IS NULL OR NOW() > v_task.otp_expires_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'OTP кодын хугацаа дууссан. "Дахин код илгээх" товчийг дарна уу.',
      'code',    'EXPIRED'
    );
  END IF;

  -- 2c. Bcrypt verify.
  IF v_task.otp_code_hash IS NULL
     OR extensions.crypt(p_otp, v_task.otp_code_hash) <> v_task.otp_code_hash
  THEN
    UPDATE public.delivery_tasks
    SET    otp_attempts = otp_attempts + 1,
           otp_locked_until = CASE
             WHEN otp_attempts + 1 >= v_max_attempts
               THEN NOW() + v_lock_window
             ELSE otp_locked_until
           END
    WHERE  id = p_task_id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'OTP код буруу байна. Дахин оролдоно уу.',
      'code',    'WRONG_OTP',
      'attempts_used',   v_task.otp_attempts + 1,
      'attempts_remaining', GREATEST(v_max_attempts - (v_task.otp_attempts + 1), 0)
    );
  END IF;

  -- 2d. Success path — mark completed and reset counters.
  UPDATE public.delivery_tasks
  SET    status           = 'completed',
         otp_verified     = TRUE,
         completed_at     = NOW(),
         otp_attempts     = 0,
         otp_locked_until = NULL
  WHERE  id = p_task_id;

  INSERT INTO public.courier_earnings
    (courier_id, task_id, amount, distance_km, completed_at)
  VALUES
    (v_courier_id, v_task.id, v_task.delivery_fee, v_task.distance_km, NOW())
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Хүргэлт амжилттай баталгаажлаа!',
    'code',    'SUCCESS'
  );
END;
$$;


-- 3. resend_epod_otp must reset counters (so a legitimate user CAN recover).
CREATE OR REPLACE FUNCTION public.resend_epod_otp(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id UUID := auth.uid();
  v_task       RECORD;
  v_otp_plain  TEXT;
  v_otp_hash   TEXT;
BEGIN
  SELECT * INTO v_task
  FROM   public.delivery_tasks
  WHERE  id         = p_task_id
    AND  courier_id = v_courier_id
    AND  status::text = 'delivered';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Даалгавар олдсонгүй.'
    );
  END IF;

  v_otp_plain := LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0');
  v_otp_hash  := extensions.crypt(v_otp_plain, extensions.gen_salt('bf', 10));

  UPDATE public.delivery_tasks
  SET    otp_code_hash    = v_otp_hash,
         otp_expires_at   = NOW() + INTERVAL '10 minutes',
         otp_verified     = FALSE,
         otp_attempts     = 0,
         otp_locked_until = NULL
  WHERE  id = p_task_id;

  RETURN jsonb_build_object(
    'success',        true,
    'task_id',        p_task_id,
    'otp_plain',      v_otp_plain,
    'customer_email', v_task.customer_email,
    'expires_at',     (NOW() + INTERVAL '10 minutes')
  );
END;
$$;


GRANT EXECUTE ON FUNCTION public.verify_epod_otp(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resend_epod_otp(UUID)         TO authenticated;
