-- 1) display_order nas tabelas de catálogo
ALTER TABLE public.brands         ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.device_models  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.storages       ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.colors         ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- 2) damage_categories: imagem de ajuda + subcategorias
ALTER TABLE public.damage_categories
  ADD COLUMN IF NOT EXISTS help_image_url text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.damage_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_damage_categories_parent ON public.damage_categories(parent_id);

-- Inicializa display_order pela ordem alfabética atual para não ficar tudo em 0
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM public.brands
)
UPDATE public.brands b SET display_order = r.rn FROM ranked r WHERE b.id = r.id AND b.display_order = 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY brand_id ORDER BY name) AS rn FROM public.device_models
)
UPDATE public.device_models m SET display_order = r.rn FROM ranked r WHERE m.id = r.id AND m.display_order = 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY capacity) AS rn FROM public.storages
)
UPDATE public.storages s SET display_order = r.rn FROM ranked r WHERE s.id = r.id AND s.display_order = 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM public.colors
)
UPDATE public.colors c SET display_order = r.rn FROM ranked r WHERE c.id = r.id AND c.display_order = 0;