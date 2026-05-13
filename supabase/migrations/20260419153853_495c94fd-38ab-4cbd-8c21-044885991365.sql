-- condition_discounts: add fixed-value mode, model filter, youtube
ALTER TABLE public.condition_discounts
  ADD COLUMN IF NOT EXISTS discount_fixed numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_mode text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS model_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS youtube_url text;

ALTER TABLE public.condition_discounts
  DROP CONSTRAINT IF EXISTS condition_discounts_discount_mode_check;
ALTER TABLE public.condition_discounts
  DROP CONSTRAINT IF EXISTS condition_discounts_discount_mode_check;
ALTER TABLE public.condition_discounts
  ADD CONSTRAINT condition_discounts_discount_mode_check
  CHECK (discount_mode IN ('percent','fixed'));

-- damage_categories: add model filter, youtube
ALTER TABLE public.damage_categories
  ADD COLUMN IF NOT EXISTS model_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS youtube_url text;

-- damage_deductions: add percent mode
ALTER TABLE public.damage_deductions
  ADD COLUMN IF NOT EXISTS deduction_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_mode text NOT NULL DEFAULT 'fixed';

ALTER TABLE public.damage_deductions
  DROP CONSTRAINT IF EXISTS damage_deductions_deduction_mode_check;
ALTER TABLE public.damage_deductions
  DROP CONSTRAINT IF EXISTS damage_deductions_deduction_mode_check;
ALTER TABLE public.damage_deductions
  ADD CONSTRAINT damage_deductions_deduction_mode_check
  CHECK (deduction_mode IN ('percent','fixed'));