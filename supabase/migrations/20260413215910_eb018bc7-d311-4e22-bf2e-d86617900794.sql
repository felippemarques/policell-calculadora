
ALTER TABLE public.lp_sections
  ADD COLUMN layout TEXT NOT NULL DEFAULT 'text-image',
  ADD COLUMN section_type TEXT NOT NULL DEFAULT 'section';

-- Seed the hero section
INSERT INTO public.lp_sections (title, content, bg_color, text_color, display_order, is_active, layout, section_type)
VALUES (
  'Quanto vale seu iPhone?',
  'Descubra o valor do seu aparelho em segundos e ganhe um cupom de desconto exclusivo para usar na nossa loja.',
  '#f0f2ff',
  '#1a1a2e',
  -1,
  true,
  'hero',
  'hero'
);
