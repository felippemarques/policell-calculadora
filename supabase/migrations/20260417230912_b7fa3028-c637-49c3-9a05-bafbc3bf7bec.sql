ALTER TABLE public.colors
  ADD COLUMN IF NOT EXISTS brand_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS hex_code text;

CREATE INDEX IF NOT EXISTS colors_brand_ids_gin_idx
  ON public.colors USING GIN (brand_ids);