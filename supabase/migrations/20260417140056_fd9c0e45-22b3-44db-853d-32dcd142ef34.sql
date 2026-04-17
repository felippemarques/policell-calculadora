-- Damage categories: optional help text + required flag
ALTER TABLE public.damage_categories
  ADD COLUMN IF NOT EXISTS help_text text,
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true;

-- Condition discounts: optional help text + required flag
ALTER TABLE public.condition_discounts
  ADD COLUMN IF NOT EXISTS help_text text,
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true;