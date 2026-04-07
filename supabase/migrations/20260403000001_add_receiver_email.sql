-- ============================================================================
-- Add receiver_email to delivery_tasks
--
-- The ePOD OTP was previously sent to the merchant's email (via profiles JOIN).
-- This migration adds a receiver_email column so the OTP goes to the actual
-- customer/receiver, and updates generate_epod_otp + resend_epod_otp to use it.
-- ============================================================================

-- ── 1. Add receiver_email column ────────────────────────────────────────────
ALTER TABLE public.delivery_tasks
  ADD COLUMN IF NOT EXISTS receiver_email TEXT;

COMMENT ON COLUMN public.delivery_tasks.receiver_email IS
  'Customer/receiver email address — used for ePOD OTP delivery';


-- ── 2. generate_epod_otp — now reads receiver_email from delivery_tasks ─────
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
  -- Fetch task; confirm ownership and 'picked_up' state
  -- No longer joins profiles — receiver_email lives on delivery_tasks
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

  -- Ensure receiver_email is set
  IF v_task.receiver_email IS NULL OR v_task.receiver_email = '' THEN
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

  -- Hash with bcrypt (cost 4 — fast enough for a short-lived OTP)
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
    'customer_email', v_task.receiver_email,
    'expires_at',     (NOW() + INTERVAL '10 minutes')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_epod_otp(UUID) TO authenticated;


-- ── 3. resend_epod_otp — now reads receiver_email from delivery_tasks ───────
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
  -- No longer joins profiles — receiver_email lives on delivery_tasks
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

  IF v_task.receiver_email IS NULL OR v_task.receiver_email = '' THEN
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
    'customer_email', v_task.receiver_email,
    'expires_at',     (NOW() + INTERVAL '10 minutes')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resend_epod_otp(UUID) TO authenticated;


-- ── 4. Update get_available_tasks to return receiver_email ──────────────────
DROP FUNCTION IF EXISTS public.get_available_tasks(INT, INT);

CREATE OR REPLACE FUNCTION public.get_available_tasks(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    task_id UUID,
    order_id UUID,
    pickup_location_id UUID,
    dropoff_location_id UUID,
    pickup_address TEXT,
    dropoff_address TEXT,
    pickup_note TEXT,
    dropoff_note TEXT,
    note TEXT,
    package_value NUMERIC,
    delivery_fee NUMERIC,
    suggested_fee NUMERIC,
    receiver_name TEXT,
    receiver_phone TEXT,
    receiver_email TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF NOT public.is_approved_courier() THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        dt.id          AS task_id,
        dt.order_id,
        dt.pickup_location_id,
        dt.dropoff_location_id,
        pl.address     AS pickup_address,
        dl.address     AS dropoff_address,
        dt.pickup_note,
        dt.dropoff_note,
        dt.note,
        dt.package_value,
        dt.delivery_fee,
        dt.suggested_fee,
        dt.receiver_name,
        dt.receiver_phone,
        dt.receiver_email,
        dt.created_at
    FROM public.delivery_tasks dt
    LEFT JOIN public.locations pl ON dt.pickup_location_id = pl.id
    LEFT JOIN public.locations dl ON dt.dropoff_location_id = dl.id
    WHERE dt.status = 'published'
      AND dt.courier_id IS NULL
    ORDER BY dt.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_available_tasks(INT, INT) TO authenticated;


-- ── 5. Update get_task_detail to return receiver_email ──────────────────────
DROP FUNCTION IF EXISTS public.get_task_detail(UUID);

CREATE OR REPLACE FUNCTION public.get_task_detail(p_task_id UUID)
RETURNS TABLE (
    task_id             UUID,
    order_id            UUID,
    courier_id          UUID,
    pickup_location_id  UUID,
    dropoff_location_id UUID,
    pickup_note         TEXT,
    dropoff_note        TEXT,
    note                TEXT,
    package_value       NUMERIC,
    delivery_fee        NUMERIC,
    suggested_fee       NUMERIC,
    receiver_name       TEXT,
    receiver_phone      TEXT,
    receiver_email      TEXT,
    status              TEXT,
    created_at          TIMESTAMPTZ
) AS $$
BEGIN
    IF NOT public.is_approved_courier() THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        dt.id                   AS task_id,
        dt.order_id,
        dt.courier_id,
        dt.pickup_location_id,
        dt.dropoff_location_id,
        dt.pickup_note,
        dt.dropoff_note,
        dt.note,
        dt.package_value,
        dt.delivery_fee,
        dt.suggested_fee,
        dt.receiver_name,
        dt.receiver_phone,
        dt.receiver_email,
        dt.status::TEXT,
        dt.created_at
    FROM public.delivery_tasks dt
    WHERE dt.id = p_task_id
      AND (
          dt.status = 'published'
          OR dt.courier_id = auth.uid()
      )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_task_detail(UUID) TO authenticated;
