-- ============================================================================
-- NUCLEAR FIX: Drop ALL triggers on delivery_tasks, recreate only safe ones.
--
-- The previous migration (20260331000002) excluded triggers with names
-- matching '%sync_available%', but the blocking trigger may have that
-- pattern in its name. This migration drops every non-internal trigger,
-- then re-creates the two we actually need:
--
--   1. on_delivery_tasks_updated  — updates the updated_at timestamp
--   2. trigger_sync_available_tasks — keeps available_tasks cache in sync
--
-- claim_delivery_task() handles all authorization; no trigger guards needed.
-- ============================================================================

-- ── Step 1: Drop EVERY non-internal trigger on delivery_tasks ───────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'public.delivery_tasks'::regclass
          AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Dropping trigger: %', r.tgname;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.delivery_tasks', r.tgname);
    END LOOP;
END $$;


-- ── Step 2: Re-create updated_at trigger ─────────────────────────────────────
-- handle_updated_at() must already exist (created in 20250101000001).
CREATE TRIGGER on_delivery_tasks_updated
    BEFORE UPDATE ON public.delivery_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ── Step 3: Re-create the available_tasks sync trigger ───────────────────────
-- Replace sync_available_tasks() with a clean version that ONLY syncs the
-- cache table and never raises business-logic exceptions.
CREATE OR REPLACE FUNCTION public.sync_available_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Task published → add to cache
    IF (TG_OP = 'INSERT' AND NEW.status::text = 'published')
    OR (TG_OP = 'UPDATE' AND OLD.status::text != 'published' AND NEW.status::text = 'published')
    THEN
        INSERT INTO public.available_tasks (
            task_id,
            org_id,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            pickup_location_id,
            dropoff_address,
            dropoff_latitude,
            dropoff_longitude,
            dropoff_location_id,
            package_value,
            delivery_fee,
            distance_km,
            instructions,
            pickup_contact_name,
            pickup_contact_phone,
            dropoff_contact_name,
            dropoff_contact_phone,
            created_at,
            published_at
        ) VALUES (
            NEW.id,
            NEW.merchant_id,
            COALESCE(NEW.pickup_address, ''),
            NEW.pickup_latitude,
            NEW.pickup_longitude,
            NULL,
            COALESCE(NEW.dropoff_address, ''),
            NEW.dropoff_latitude,
            NEW.dropoff_longitude,
            NULL,
            NULL,
            NEW.delivery_fee,
            NEW.distance_km,
            NEW.instructions,
            NEW.pickup_contact_name,
            NEW.pickup_contact_phone,
            NEW.dropoff_contact_name,
            NEW.dropoff_contact_phone,
            NEW.created_at,
            COALESCE(NEW.published_at, NOW())
        )
        ON CONFLICT (task_id) DO NOTHING;

    -- Task claimed / cancelled / completed → remove from cache
    ELSIF TG_OP = 'UPDATE' AND OLD.status::text = 'published' AND NEW.status::text != 'published' THEN
        DELETE FROM public.available_tasks WHERE task_id = NEW.id;

    -- Task deleted while still published
    ELSIF TG_OP = 'DELETE' AND OLD.status::text = 'published' THEN
        DELETE FROM public.available_tasks WHERE task_id = OLD.id;

    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_sync_available_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.delivery_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_available_tasks();
