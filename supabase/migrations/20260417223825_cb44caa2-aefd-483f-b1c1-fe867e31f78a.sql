ALTER TABLE public.damage_categories
ADD COLUMN IF NOT EXISTS parent_option_id uuid REFERENCES public.damage_deductions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_damage_categories_parent_option_id
ON public.damage_categories (parent_option_id);