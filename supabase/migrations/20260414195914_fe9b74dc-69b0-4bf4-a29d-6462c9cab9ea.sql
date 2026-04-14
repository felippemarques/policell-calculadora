
ALTER TABLE public.lp_sections
ADD COLUMN cta_text text DEFAULT 'Avaliar meu aparelho',
ADD COLUMN cta_bg_color text DEFAULT NULL,
ADD COLUMN cta_text_color text DEFAULT NULL,
ADD COLUMN cta_border_radius integer DEFAULT 8;
