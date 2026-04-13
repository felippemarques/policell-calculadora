
-- Create storage bucket for LP section images
INSERT INTO storage.buckets (id, name, public) VALUES ('lp-images', 'lp-images', true);

-- Public read
CREATE POLICY "Public read lp-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lp-images');

-- Admin upload
CREATE POLICY "Admins can upload lp-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lp-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin update
CREATE POLICY "Admins can update lp-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lp-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin delete
CREATE POLICY "Admins can delete lp-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lp-images' AND public.has_role(auth.uid(), 'admin'));
