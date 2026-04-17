-- 1) Remove duplicate devices keeping the oldest one per (brand, model, storage)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY lower(trim(brand)), lower(trim(model)), lower(trim(storage))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.devices
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
-- Reassign any evaluations/leads pointing at duplicates to the kept device first
, kept AS (
  SELECT lower(trim(d.brand)) AS b, lower(trim(d.model)) AS m, lower(trim(d.storage)) AS s, d.id AS keep_id
  FROM public.devices d
  JOIN ranked r ON r.id = d.id
  WHERE r.rn = 1
)
, mapping AS (
  SELECT d.id AS dup_id, k.keep_id
  FROM public.devices d
  JOIN ranked r ON r.id = d.id AND r.rn > 1
  JOIN kept k ON k.b = lower(trim(d.brand)) AND k.m = lower(trim(d.model)) AND k.s = lower(trim(d.storage))
)
UPDATE public.evaluations e
SET device_id = m.keep_id
FROM mapping m
WHERE e.device_id = m.dup_id;

-- Same reassignment for leads
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY lower(trim(brand)), lower(trim(model)), lower(trim(storage))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.devices
),
kept AS (
  SELECT lower(trim(d.brand)) AS b, lower(trim(d.model)) AS m, lower(trim(d.storage)) AS s, d.id AS keep_id
  FROM public.devices d
  JOIN ranked r ON r.id = d.id
  WHERE r.rn = 1
),
mapping AS (
  SELECT d.id AS dup_id, k.keep_id
  FROM public.devices d
  JOIN ranked r ON r.id = d.id AND r.rn > 1
  JOIN kept k ON k.b = lower(trim(d.brand)) AND k.m = lower(trim(d.model)) AND k.s = lower(trim(d.storage))
)
UPDATE public.leads l
SET device_id = m.keep_id
FROM mapping m
WHERE l.device_id = m.dup_id;

-- Now actually delete the duplicates
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY lower(trim(brand)), lower(trim(model)), lower(trim(storage))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.devices
)
DELETE FROM public.devices
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Prevent future duplicates with a unique index (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS devices_unique_brand_model_storage_idx
ON public.devices (lower(trim(brand)), lower(trim(model)), lower(trim(storage)));