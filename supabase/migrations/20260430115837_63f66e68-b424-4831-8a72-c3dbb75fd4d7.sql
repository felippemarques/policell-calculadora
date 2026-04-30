-- Add visibility flag to devices: controls whether each storage+color combo
-- appears for the client in the trade-in calculator.
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Helper to sort device.storage text by storages.display_order
CREATE OR REPLACE FUNCTION public.storage_display_order(_capacity TEXT)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT display_order FROM public.storages
      WHERE lower(trim(capacity)) = lower(trim(_capacity))
      LIMIT 1),
    9999
  );
$$;