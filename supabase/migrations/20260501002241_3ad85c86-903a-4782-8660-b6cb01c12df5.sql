-- 1) Brand logo
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS logo_url text;

-- 2) Seed calculator hero + flow customization settings (idempotent)
INSERT INTO public.lp_settings (key, value) VALUES
  ('calc_hero_bg_image', ''),
  ('calc_hero_bg_color', ''),
  ('calc_hero_text_color', ''),
  ('calc_hero_title', 'Policell - Garantia de entrega e qualidade'),
  ('calc_hero_subtitle', 'Seu aparelho vale mais do que você imagina.'),
  ('flow_trade_icon_url', ''),
  ('flow_trade_card_bg', ''),
  ('flow_sale_icon_url', ''),
  ('flow_sale_card_bg', '')
ON CONFLICT (key) DO NOTHING;