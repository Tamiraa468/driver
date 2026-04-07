-- ============================================================================
-- ePOD (Electronic Proof of Delivery) + Completed Status
-- Adds:
--   • 'completed' status to delivery_tasks
--   • OTP fields for ePOD verification
--   • Partial unique index → one active delivery per courier
--   • claim_delivery_task (updated with one-active guard)
--   • generate_epod_otp  (transitions to 'delivered', issues hashed OTP)
--   • verify_epod_otp    (verifies OTP, transitions to 'completed', logs earnings)
-- ============================================================================

-- ── pgcrypto for bcrypt OTP hashing ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ── 1. Extend task_status enum to include 'completed' (and 'cancelled' if missing)
-- The delivery_tasks.status column uses a task_status ENUM type, not a TEXT+CHECK.
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent and safe to re-run.
DO $$
BEGIN
  -- Add 'cancelled' if the enum was originally defined without it
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.task_status'::regtype
      AND enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.task_status ADD VALUE 'cancelled';
  END IF;

  -- Add 'completed' — the new terminal state after ePOD verification
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.task_status'::regtype
      AND enumlabel = 'completed'
  ) THEN
    ALTER TYPE public.task_status ADD VALUE 'completed';
  END IF;
END $$;


-- ── 2. Add ePOD columns ──────────────────────────────────────────────────────
ALTER TABLE public.delivery_tasks
  ADD COLUMN IF NOT EXISTS otp_code_hash  TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ;


-- ── 3. One active delivery per courier ──────────────────────────────────────
-- A partial unique index enforces that courier_id is unique among the rows
-- whose status is still in an "active" (incomplete) state.  When a delivery
-- reaches 'completed' or 'cancelled' it falls outside the index, freeing the
-- courier to accept a new task.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_delivery_per_courier
  ON public.delivery_tasks (courier_id)
  WHERE status IN ('assigned', 'picked_up', 'delivered');


-- ── 4. RLS: allow couriers to read 'completed' tasks they own ───────────────
-- Recreate the select policy to include 'completed' in the visible set.
DROP POLICY IF EXISTS "delivery_tasks_courier_select" ON public.delivery_tasks;
CREATE POLICY "delivery_tasks_courier_select" ON public.delivery_tasks
  FOR SELECT
  USING (
    public.is_approved_courier()
    AND (
      status = 'published'
      OR courier_id = auth.uid()
    )
  );

-- Recreate the update policy to allow transitions out of 'delivered' → 'completed'.
DROP POLICY IF EXISTS "delivery_tasks_courier_update_own" ON public.delivery_tasks;
CREATE POLICY "delivery_tasks_courier_update_own" ON public.delivery_tasks
  FOR UPDATE
  USING (
    public.is_approved_courier()
    AND courier_id = auth.uid()
    AND status IN ('assigned', 'picked_up', 'delivered')
  )
  WITH CHECK (
    courier_id = auth.uid()
  );


-- ── 5. claim_delivery_task (updated) ────────────────────────────────────────
-- The existing function returns JSONB (set in FIX_claim_delivery_task.sql).
-- Must keep RETURNS JSONB to avoid "cannot change return type" error.
CREATE OR REPLACE FUNCTION public.claim_delivery_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id  UUID    := auth.uid();
  v_has_active  BOOLEAN;
  v_task        RECORD;
BEGIN
  -- Gate: only approved couriers may claim
  IF NOT public.is_approved_courier() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Таны бүртгэл баталгаажаагүй байна.',
      'task_id', p_task_id,
      'courier_id', v_courier_id
    );
  END IF;

  -- Gate: one active delivery at a time
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_tasks
    WHERE  courier_id = v_courier_id
      AND  status::text IN ('assigned', 'picked_up', 'delivered')
  ) INTO v_has_active;

  IF v_has_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Танд идэвхтэй хүргэлт байна. Эхлэн дуусгасны дараа шинэ хүргэлт авна уу.',
      'task_id', p_task_id,
      'courier_id', v_courier_id
    );
  END IF;

  -- Atomically lock the row; SKIP LOCKED drops it if another session grabbed it first
  SELECT * INTO v_task
  FROM   public.delivery_tasks
  WHERE  id     = p_task_id
    AND  status::text = 'published'
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Энэ хүргэлт авах боломжгүй болсон байна.',
      'task_id', p_task_id,
      'courier_id', v_courier_id
    );
  END IF;

  -- Assign
  UPDATE public.delivery_tasks
  SET    status      = 'assigned',
         courier_id  = v_courier_id,
         assigned_at = NOW()
  WHERE  id = p_task_id;

  RETURN jsonb_build_object(
    'success',    true,
    'task_id',    p_task_id,
    'courier_id', v_courier_id,
    'message',    'Хүргэлт амжилттай хүлээн авлаа.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_delivery_task(UUID) TO authenticated;


-- ── 6. generate_epod_otp ─────────────────────────────────────────────────────
-- Called exclusively by the send-otp-email Edge Function (with the courier's JWT).
-- Transitions the task from 'picked_up' → 'delivered', generates a 6-digit OTP,
-- stores its bcrypt hash, and returns the plain OTP + merchant/customer email so
-- the Edge Function can dispatch the email without touching the plain text again.
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
  -- Fetch task with merchant email; confirm ownership and 'picked_up' state
  SELECT dt.*, p.email AS owner_email
  INTO   v_task
  FROM   public.delivery_tasks dt
  JOIN   public.profiles        p  ON p.id = dt.merchant_id
  WHERE  dt.id         = p_task_id
    AND  dt.courier_id = v_courier_id
    AND  dt.status::text = 'picked_up';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Даалгавар олдсонгүй эсвэл "picked_up" төлөвт биш байна.'
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
    'customer_email', v_task.owner_email,
    'expires_at',     (NOW() + INTERVAL '10 minutes')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_epod_otp(UUID) TO authenticated;


-- ── 7. verify_epod_otp ───────────────────────────────────────────────────────
-- Called by the courier after the customer reads out their OTP.
-- Verifies the hash, transitions 'delivered' → 'completed', and inserts an
-- earnings record.
CREATE OR REPLACE FUNCTION public.verify_epod_otp(p_task_id UUID, p_otp TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id UUID := auth.uid();
  v_task       RECORD;
BEGIN
  SELECT * INTO v_task
  FROM   public.delivery_tasks
  WHERE  id         = p_task_id
    AND  courier_id = v_courier_id
    AND  status::text = 'delivered';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Даалгавар олдсонгүй эсвэл "delivered" төлөвт биш байна.'
    );
  END IF;

  -- Check expiry
  IF v_task.otp_expires_at IS NULL OR NOW() > v_task.otp_expires_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'OTP кодын хугацаа дууссан. "Дахин код илгээх" товчийг дарна уу.'
    );
  END IF;

  -- Verify bcrypt hash
  IF v_task.otp_code_hash IS NULL
     OR crypt(p_otp, v_task.otp_code_hash) <> v_task.otp_code_hash
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'OTP код буруу байна. Дахин оролдоно уу.'
    );
  END IF;

  -- Mark completed
  UPDATE public.delivery_tasks
  SET    status       = 'completed',
         otp_verified = TRUE,
         completed_at = NOW()
  WHERE  id = p_task_id;

  -- Record earnings (idempotent via ON CONFLICT DO NOTHING)
  INSERT INTO public.courier_earnings
    (courier_id, task_id, amount, distance_km, completed_at)
  VALUES
    (v_courier_id, v_task.id, v_task.delivery_fee, v_task.distance_km, NOW())
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Хүргэлт амжилттай баталгаажлаа!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_epod_otp(UUID, TEXT) TO authenticated;


-- ── 8. resend_epod_otp ───────────────────────────────────────────────────────
-- Regenerates and re-hashes an OTP for an already-delivered task whose code
-- has expired.  Returns the new plain OTP for the Edge Function to re-send.
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
  SELECT dt.*, p.email AS owner_email
  INTO   v_task
  FROM   public.delivery_tasks dt
  JOIN   public.profiles        p ON p.id = dt.merchant_id
  WHERE  dt.id         = p_task_id
    AND  dt.courier_id = v_courier_id
    AND  dt.status::text = 'delivered';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Дахин код илгээх боломжгүй байна.'
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
    'customer_email', v_task.owner_email,
    'expires_at',     (NOW() + INTERVAL '10 minutes')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resend_epod_otp(UUID) TO authenticated;


-- ── Comments ─────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.claim_delivery_task(UUID)  IS
  'Atomically claims a published task. Blocks if the courier already has an active delivery (assigned/picked_up/delivered).';
COMMENT ON FUNCTION public.generate_epod_otp(UUID)    IS
  'Transitions task to delivered, generates + hashes a 6-digit ePOD OTP. Plain OTP returned for Edge Function email dispatch only — never stored in plaintext.';
COMMENT ON FUNCTION public.verify_epod_otp(UUID, TEXT) IS
  'Verifies ePOD OTP via bcrypt. On success marks delivery completed and inserts a courier_earnings record.';
COMMENT ON FUNCTION public.resend_epod_otp(UUID)      IS
  'Regenerates ePOD OTP for a delivered-but-not-yet-verified task. Use when the original code expires.';
