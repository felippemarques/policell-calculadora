-- Backfill devices.brand_id from existing brand text column
UPDATE public.devices d
SET brand_id = b.id
FROM public.brands b
WHERE d.brand_id IS NULL
  AND lower(trim(d.brand)) = lower(trim(b.name));

-- Trigger to keep brand_id in sync going forward when only brand text is provided
CREATE OR REPLACE FUNCTION public.sync_device_brand_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brand_id IS NULL AND NEW.brand IS NOT NULL THEN
    SELECT id INTO NEW.brand_id
    FROM public.brands
    WHERE lower(trim(name)) = lower(trim(NEW.brand))
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_device_brand_id ON public.devices;
DROP TRIGGER IF EXISTS trg_sync_device_brand_id ON public.devices;
CREATE TRIGGER trg_sync_device_brand_id
BEFORE INSERT OR UPDATE ON public.devices
FOR EACH ROW EXECUTE FUNCTION public.sync_device_brand_id();