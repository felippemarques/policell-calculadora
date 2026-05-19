-- supabase/migrations/20260518000001_wm10_product_id.sql

-- Coluna de vínculo com produto WM10 na tabela devices
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS wm10_product_id INTEGER;

-- Configurações WM10 na tabela de settings
INSERT INTO public.lp_settings (key, value) VALUES
  ('wm10_store_url', ''),
  ('wm10_cnpj', ''),
  ('wm10_token', ''),
  ('wm10_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Prevent anonymous users from reading WM10 credentials
-- The existing "Anyone can read settings" policy (USING true) allows public SELECT
-- on all rows. This additive policy restricts wm10_* keys to admin users only.
-- RLS evaluates all applicable policies with OR logic (permissive), so we replace
-- the broad policy with two targeted ones: public keys open, wm10_ keys admin-only.
DROP POLICY IF EXISTS "Anyone can read settings" ON public.lp_settings;
CREATE POLICY IF NOT EXISTS "Public can read non-secret settings"
  ON public.lp_settings
  FOR SELECT
  USING (key NOT LIKE 'wm10_%');

CREATE POLICY IF NOT EXISTS "wm10_secrets_admin_only"
  ON public.lp_settings
  FOR SELECT
  TO authenticated
  USING (
    key NOT LIKE 'wm10_%'
    OR (SELECT has_role(auth.uid(), 'admin'::app_role))
  );
