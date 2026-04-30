-- 1) image_url em device_models
ALTER TABLE public.device_models
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2) is_visible em model_storages (controle por capacidade)
ALTER TABLE public.model_storages
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- 3) is_visible em variant_colors (controle por cor da variante)
ALTER TABLE public.variant_colors
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- 4) Bucket público para imagens de aparelhos
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-images', 'device-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5) RLS policies do bucket
DROP POLICY IF EXISTS "Public can read device images" ON storage.objects;
CREATE POLICY "Public can read device images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'device-images');

DROP POLICY IF EXISTS "Admins can upload device images" ON storage.objects;
CREATE POLICY "Admins can upload device images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'device-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update device images" ON storage.objects;
CREATE POLICY "Admins can update device images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'device-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete device images" ON storage.objects;
CREATE POLICY "Admins can delete device images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'device-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));