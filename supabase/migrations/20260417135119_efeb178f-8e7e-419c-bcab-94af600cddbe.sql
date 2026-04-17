-- 1. Add brand_id column to devices (nullable for backfill)
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id);

-- 2. Backfill: match devices.brand (text) → brands.name (case-insensitive)
UPDATE public.devices d
SET brand_id = b.id
FROM public.brands b
WHERE d.brand_id IS NULL
  AND lower(trim(d.brand)) = lower(trim(b.name));

-- 3. For any device whose brand text doesn't yet exist in brands, create the brand and link it
INSERT INTO public.brands (name)
SELECT DISTINCT trim(d.brand)
FROM public.devices d
WHERE d.brand_id IS NULL
  AND d.brand IS NOT NULL
  AND trim(d.brand) <> ''
ON CONFLICT DO NOTHING;

UPDATE public.devices d
SET brand_id = b.id
FROM public.brands b
WHERE d.brand_id IS NULL
  AND lower(trim(d.brand)) = lower(trim(b.name));

-- 4. Performance indexes for the dashboard metrics endpoint
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at ON public.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_device_id ON public.leads (device_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON public.evaluations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_device_id ON public.evaluations (device_id);
CREATE INDEX IF NOT EXISTS idx_devices_brand_id ON public.devices (brand_id);