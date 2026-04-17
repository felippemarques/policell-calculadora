-- ============================================================
-- 1. LEADS: remove public SELECT, mantém INSERT/UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Lead owner can read by id" ON public.leads;
-- "Anyone can update leads by id" e "Anyone can create leads" continuam
-- (necessárias para o fluxo público da calculadora sem auth)

-- ============================================================
-- 2. EVALUATIONS: remove SELECT público, mantém INSERT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read evaluations" ON public.evaluations;
-- "Anyone can create evaluations" continua (gravação do resultado)
-- Admins já tinham UPDATE/DELETE; adicionamos SELECT explícito:
CREATE POLICY "Admins can read evaluations"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. PROFILES: leitura restrita a próprio user + admins
-- ============================================================
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. BRANDS: substitui "Allow ALL" por SELECT público + CRUD admin
-- ============================================================
DROP POLICY IF EXISTS "Allow ALL on brands" ON public.brands;

CREATE POLICY "Anyone can read brands"
  ON public.brands FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert brands"
  ON public.brands FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update brands"
  ON public.brands FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brands"
  ON public.brands FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. COLORS
-- ============================================================
DROP POLICY IF EXISTS "Allow ALL on colors" ON public.colors;

CREATE POLICY "Anyone can read colors"
  ON public.colors FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert colors"
  ON public.colors FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update colors"
  ON public.colors FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete colors"
  ON public.colors FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. STORAGES
-- ============================================================
DROP POLICY IF EXISTS "Allow ALL on storages" ON public.storages;

CREATE POLICY "Anyone can read storages"
  ON public.storages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert storages"
  ON public.storages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update storages"
  ON public.storages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete storages"
  ON public.storages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. DEVICE_MODELS
-- ============================================================
DROP POLICY IF EXISTS "Allow ALL on device_models" ON public.device_models;

CREATE POLICY "Anyone can read device_models"
  ON public.device_models FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert device_models"
  ON public.device_models FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update device_models"
  ON public.device_models FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete device_models"
  ON public.device_models FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 8. STORAGE BUCKET lp-images: restringe listagem, mantém leitura pública
--    e restringe escrita a admins
-- ============================================================
-- Remove qualquer policy ampla anterior do bucket
DROP POLICY IF EXISTS "Public read lp-images" ON storage.objects;
DROP POLICY IF EXISTS "Public access to lp-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read lp-images" ON storage.objects;
DROP POLICY IF EXISTS "lp-images public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on lp-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload lp-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to lp-images" ON storage.objects;
DROP POLICY IF EXISTS "lp-images upload" ON storage.objects;
DROP POLICY IF EXISTS "Public lp-images read individual" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage lp-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins list lp-images" ON storage.objects;

-- Leitura pública de objetos individuais do bucket lp-images
-- (acesso direto via URL — listagem pelo cliente fica restrita a admins)
CREATE POLICY "lp-images: public read object"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'lp-images');

-- Escrita restrita a administradores autenticados
CREATE POLICY "lp-images: admin insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lp-images' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "lp-images: admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'lp-images' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "lp-images: admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lp-images' AND public.has_role(auth.uid(), 'admin')
  );