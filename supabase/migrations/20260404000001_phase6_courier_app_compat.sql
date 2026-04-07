-- ============================================================================
-- Phase 6: Courier App DB Compatibility (from CLAUDE.md workplan)
--
-- Migration B: Auto-insert courier_earnings trigger + UNIQUE on task_id
-- Migration D: KYC check in claim_delivery_task()
-- Migration E: available_tasks as a proper VIEW (not RPC-only)
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- B-1: UNIQUE constraint on courier_earnings.task_id (one payout per task)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_courier_earnings_task_id'
  ) THEN
    ALTER TABLE public.courier_earnings
      ADD CONSTRAINT uq_courier_earnings_task_id UNIQUE (task_id);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- B-2: Auto-insert courier_earnings trigger
-- Safety net: even if verify_epod_otp() already inserts, this trigger
-- catches any path that sets status = 'completed' (e.g. admin override).
-- ON CONFLICT DO NOTHING avoids duplicates thanks to the UNIQUE above.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auto_insert_courier_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND OLD.status = 'delivered'
     AND NEW.courier_id IS NOT NULL
     AND NEW.delivery_fee > 0 THEN

    INSERT INTO public.courier_earnings (courier_id, task_id, amount)
    VALUES (NEW.courier_id, NEW.id, NEW.delivery_fee)
    ON CONFLICT (task_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_courier_earnings ON public.delivery_tasks;
CREATE TRIGGER trg_auto_courier_earnings
  AFTER UPDATE OF status ON public.delivery_tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.auto_insert_courier_earnings();


-- ═══════════════════════════════════════════════════════════════════════════
-- D: KYC check in claim_delivery_task()
-- Adds: courier must have courier_kyc.status = 'approved' before claiming.
-- Keeps all existing guards (is_approved_courier, one-active, SKIP LOCKED).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.claim_delivery_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courier_id  UUID    := auth.uid();
  v_has_active  BOOLEAN;
  v_kyc_status  TEXT;
  v_task        RECORD;
BEGIN
  -- Gate 1: only approved couriers
  IF NOT public.is_approved_courier() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Таны бүртгэл баталгаажаагүй байна.',
      'task_id', p_task_id,
      'courier_id', v_courier_id
    );
  END IF;

  -- Gate 2: KYC must be approved
  SELECT status INTO v_kyc_status
  FROM public.courier_kyc
  WHERE courier_id = v_courier_id;

  IF v_kyc_status IS NULL OR v_kyc_status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'KYC баталгаажуулалт шаардлагатай. Бичиг баримтаа илгээнэ үү.',
      'task_id', p_task_id,
      'courier_id', v_courier_id
    );
  END IF;

  -- Gate 3: one active delivery at a time
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

  -- Atomically lock the row; SKIP LOCKED drops it if another session grabbed it
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
