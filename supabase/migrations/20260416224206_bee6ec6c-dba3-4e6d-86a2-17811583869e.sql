-- Add option_name and is_rejected to damage_deductions to support multiple options per category
ALTER TABLE public.damage_deductions
  ADD COLUMN IF NOT EXISTS option_name TEXT NOT NULL DEFAULT 'Padrão',
  ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows: set option_name to category name when generic
UPDATE public.damage_deductions d
SET option_name = c.name
FROM public.damage_categories c
WHERE d.damage_category_id = c.id
  AND d.option_name = 'Padrão';