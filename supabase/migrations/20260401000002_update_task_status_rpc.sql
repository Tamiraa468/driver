-- ============================================================================
-- RPC: update_task_status — SECURITY DEFINER to bypass RLS recursion
-- Mirrors the pattern used by claim_delivery_task.
-- Allows courier to progress: assigned → picked_up → delivered
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_task_status(
  p_task_id UUID,
  p_new_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_courier_id UUID;
  v_current_status TEXT;
  v_row RECORD;
BEGIN
  v_courier_id := auth.uid();

  -- Guard: must be an approved courier
  IF NOT public.is_approved_courier() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Зөвшөөрөгдөөгүй: Та баталгаажсан курьер биш байна'
    );
  END IF;

  -- Guard: only allow valid target statuses
  IF p_new_status NOT IN ('picked_up', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Зөвхөн picked_up эсвэл delivered төлөв руу шилжүүлэх боломжтой'
    );
  END IF;

  -- Fetch current task
  SELECT id, courier_id, status::text INTO v_row
  FROM public.delivery_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Хүргэлт олдсонгүй');
  END IF;

  -- Guard: must own the task
  IF v_row.courier_id IS NULL OR v_row.courier_id != v_courier_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Энэ хүргэлт танд хуваарилагдаагүй байна');
  END IF;

  -- Guard: valid status transitions
  IF p_new_status = 'picked_up' AND v_row.status != 'assigned' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Зөвхөн "assigned" төлөвтэй хүргэлтийг "picked_up" болгох боломжтой'
    );
  END IF;

  IF p_new_status = 'delivered' AND v_row.status != 'picked_up' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Зөвхөн "picked_up" төлөвтэй хүргэлтийг "delivered" болгох боломжтой'
    );
  END IF;

  -- Perform the update
  UPDATE public.delivery_tasks
  SET status      = p_new_status::task_status,
      picked_up_at = CASE WHEN p_new_status = 'picked_up' THEN NOW() ELSE picked_up_at END,
      delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END
  WHERE id = p_task_id
    AND courier_id = v_courier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Хүргэлтийн төлөвийг шинэчилж чадсангүй');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Төлөв амжилттай шинэчлэгдлээ',
    'task_id', p_task_id,
    'new_status', p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_task_status(UUID, TEXT) TO authenticated;
