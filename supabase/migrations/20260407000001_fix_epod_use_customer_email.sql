-- ============================================================================
-- Fix ePOD OTP functions to use customer_email instead of receiver_email
--
-- The merchant portal stores the email in `customer_email` column,
-- but generate_epod_otp / resend_epod_otp were reading `receiver_email`.
-- This migration rewrites both RPCs to use the correct column.
-- ============================================================================

-- ── 1. generate_epod_otp — use customer_email ─────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_epod_otp(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id UUID := auth.uid();
  v_otp_plain  TEXT;
  v_otp_hash   TEXT;
  v_task       RECORD;
BEGIN
  SELECT *
  INTO   v_task
  FROM   public.delivery_tasks
  WHERE  id         = p_task_id
    AND  courier_id = v_courier_id
    AND  status::text = 'picked_up';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Даалгавар олдсонгүй эсвэл "picked_up" төлөвт биш байна.'
    );
  END IF;

  -- Ensure customer_email is set
  IF v_task.customer_email IS NULL OR v_task.customer_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Хүлээн авагчийн имэйл хаяг бүртгэгдээгүй байна.'
    );
  END IF;

  -- Generate 6-digit OTP (100000–999999)
  v_otp_plain := lpad(
    ((floor(random() * 900000) + 100000)::int)::text,
    6, '0'
  );

  -- Hash with bcrypt
  v_otp_hash := crypt(v_otp_plain, gen_salt('bf', 4));

  -- Transition status and persist hash
  UPDATE public.delivery_tasks
  SET    status         = 'delivered',
         delivered_at   = NOW(),
         otp_code_hash  = v_otp_hash,
         otp_expires_at = NOW() + INTERVAL '10 minutes',
         otp_verified   = FALSE
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

GRANT EXECUTE ON FUNCTION public.generate_epod_otp(UUID) TO authenticated;


-- ── 2. resend_epod_otp — use customer_email ───────────────────────────────
CREATE OR REPLACE FUNCTION public.resend_epod_otp(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id UUID := auth.uid();
  v_otp_plain  TEXT;
  v_otp_hash   TEXT;
  v_task       RECORD;
BEGIN
  SELECT *
  INTO   v_task
  FROM   public.delivery_tasks
  WHERE  id         = p_task_id
    AND  courier_id = v_courier_id
    AND  status::text = 'delivered';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Дахин код илгээх боломжгүй байна.'
    );
  END IF;

  IF v_task.customer_email IS NULL OR v_task.customer_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Хүлээн авагчийн имэйл хаяг бүртгэгдээгүй байна.'
    );
  END IF;

  v_otp_plain := lpad(
    ((floor(random() * 900000) + 100000)::int)::text,
    6, '0'
  );
  v_otp_hash := crypt(v_otp_plain, gen_salt('bf', 4));

  UPDATE public.delivery_tasks
  SET    otp_code_hash  = v_otp_hash,
         otp_expires_at = NOW() + INTERVAL '10 minutes',
         otp_verified   = FALSE
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

GRANT EXECUTE ON FUNCTION public.resend_epod_otp(UUID) TO authenticated;
