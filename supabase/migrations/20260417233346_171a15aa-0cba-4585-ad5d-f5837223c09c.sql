-- Replace unique index on (brand, model, storage) with one that includes colors,
-- so that color is part of the device variant (not just informational).
DROP INDEX IF EXISTS public.devices_unique_brand_model_storage_idx;

CREATE UNIQUE INDEX IF NOT EXISTS devices_unique_brand_model_storage_color_idx
  ON public.devices (
    lower(trim(brand)),
    lower(trim(model)),
    lower(trim(storage)),
    lower(trim(coalesce(colors, '')))
  );