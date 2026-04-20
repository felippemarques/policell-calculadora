ALTER TABLE public.assessment_criteria
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.condition_discounts
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.damage_categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;