
ALTER TABLE public.lp_sections
ADD COLUMN IF NOT EXISTS cta_text text DEFAULT 'Avaliar meu aparelho',
ADD COLUMN IF NOT EXISTS cta_bg_color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cta_text_color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cta_border_radius integer DEFAULT 8;
