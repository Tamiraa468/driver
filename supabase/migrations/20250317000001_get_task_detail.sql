-- ============================================================================
-- get_task_detail(p_task_id UUID)
--
-- Returns detail for a single delivery task.
-- Uses ONLY columns confirmed safe by the get_available_tasks function.
-- No locations join — avoids unknown column names in that table.
-- ============================================================================

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
    status              TEXT,
    created_at          TIMESTAMPTZ
) AS $$
BEGIN
    -- Guard: only approved couriers
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
