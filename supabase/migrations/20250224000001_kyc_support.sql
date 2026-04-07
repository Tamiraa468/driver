-- ============================================================================
-- KYC (Know Your Customer) SUPPORT FOR COURIER APP
-- Adds courier_kyc table and extends profiles.status with 'kyc_submitted'
-- ============================================================================

-- 1. Extend profiles.status CHECK constraint to allow 'kyc_submitted'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'kyc_submitted', 'approved', 'blocked'));

-- 2. Create courier_kyc table to store verification documents
CREATE TABLE IF NOT EXISTS public.courier_kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Document URLs (stored in Supabase Storage)
    id_front_url TEXT NOT NULL,
    id_back_url TEXT NOT NULL,
    vehicle_registration_url TEXT,
    selfie_url TEXT,

    -- Vehicle info
    vehicle_type TEXT,
    license_plate TEXT,

    -- Review workflow
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id UUID REFERENCES public.profiles(id),
    reviewer_notes TEXT,

    -- Timestamps
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courier_kyc_courier ON public.courier_kyc(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_kyc_status ON public.courier_kyc(status);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS on_courier_kyc_updated ON public.courier_kyc;
CREATE TRIGGER on_courier_kyc_updated
    BEFORE UPDATE ON public.courier_kyc
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. RLS Policies for courier_kyc
-- ============================================================================

ALTER TABLE public.courier_kyc ENABLE ROW LEVEL SECURITY;

-- Couriers can read their own KYC record
CREATE POLICY "Couriers can view own kyc"
    ON public.courier_kyc FOR SELECT
    USING (courier_id = auth.uid());

-- Couriers can insert/update their own KYC record (only when status is pending)
CREATE POLICY "Couriers can submit kyc"
    ON public.courier_kyc FOR INSERT
    WITH CHECK (courier_id = auth.uid());

CREATE POLICY "Couriers can update own pending kyc"
    ON public.courier_kyc FOR UPDATE
    USING (courier_id = auth.uid() AND status = 'pending');

-- Admins can read all KYC records
CREATE POLICY "Admins can view all kyc"
    ON public.courier_kyc FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any KYC record (approve/reject)
CREATE POLICY "Admins can review kyc"
    ON public.courier_kyc FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- 4. Optional: trigger to auto-approve profile when KYC is approved
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_kyc_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When admin approves KYC, automatically update profile status
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE public.profiles
        SET status = 'approved'
        WHERE id = NEW.courier_id;

        NEW.reviewed_at = NOW();
    END IF;

    -- When KYC is rejected, revert profile to pending so driver can re-submit
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        UPDATE public.profiles
        SET status = 'pending'
        WHERE id = NEW.courier_id;

        NEW.reviewed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kyc_status_change ON public.courier_kyc;
CREATE TRIGGER on_kyc_status_change
    BEFORE UPDATE ON public.courier_kyc
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_kyc_approval();
