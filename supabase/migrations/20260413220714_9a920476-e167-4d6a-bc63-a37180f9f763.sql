
CREATE TABLE IF NOT EXISTS public.lp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.lp_settings;
CREATE POLICY "Anyone can read settings" ON public.lp_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert settings" ON public.lp_settings;
CREATE POLICY "Admins can insert settings" ON public.lp_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update settings" ON public.lp_settings;
CREATE POLICY "Admins can update settings" ON public.lp_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete settings" ON public.lp_settings;
CREATE POLICY "Admins can delete settings" ON public.lp_settings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_lp_settings_updated_at ON public.lp_settings;
CREATE TRIGGER update_lp_settings_updated_at BEFORE UPDATE ON public.lp_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default settings
INSERT INTO public.lp_settings (key, value) VALUES
  ('logo_url', ''),
  ('phone', ''),
  ('email', ''),
  ('whatsapp', ''),
  ('instagram', ''),
  ('facebook', ''),
  ('tiktok', ''),
  ('header_bg_color', '#ffffff'),
  ('header_text_color', '#000000');
