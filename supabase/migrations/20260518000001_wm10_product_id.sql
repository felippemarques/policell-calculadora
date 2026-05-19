-- supabase/migrations/20260518000001_wm10_product_id.sql

-- Coluna de vínculo com produto WM10 na tabela devices
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS wm10_product_id INTEGER;

-- Configurações WM10 na tabela de settings
INSERT INTO lp_settings (key, value) VALUES
  ('wm10_store_url', ''),
  ('wm10_cnpj', ''),
  ('wm10_token', ''),
  ('wm10_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
