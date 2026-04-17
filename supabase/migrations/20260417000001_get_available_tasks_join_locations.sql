-- ============================================================================
-- FIX: get_available_tasks — join locations for real pickup/dropoff addresses
-- pickup_note/dropoff_note are free-text instructions, not addresses.
-- Real addresses live on locations.address_text via pickup_location_id FK.
-- ============================================================================

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
        dt.id                                               AS task_id,
        dt.order_id,
        dt.pickup_location_id,
        dt.dropoff_location_id,
        COALESCE(pl.address_text, dt.pickup_note)           AS pickup_address,
        COALESCE(dl.address_text, dt.dropoff_note)          AS dropoff_address,
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
    LEFT JOIN public.locations pl ON pl.id = dt.pickup_location_id
    LEFT JOIN public.locations dl ON dl.id = dt.dropoff_location_id
    WHERE dt.status = 'published'
      AND dt.courier_id IS NULL
    ORDER BY dt.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_available_tasks(INT, INT) TO authenticated;
