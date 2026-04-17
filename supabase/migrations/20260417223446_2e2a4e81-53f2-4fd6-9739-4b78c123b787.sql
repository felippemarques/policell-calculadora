ALTER TABLE public.damage_categories
ADD COLUMN IF NOT EXISTS brand_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_damage_categories_brand_ids
ON public.damage_categories USING GIN (brand_ids);