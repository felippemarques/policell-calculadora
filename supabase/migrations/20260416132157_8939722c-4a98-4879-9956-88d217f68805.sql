
-- Create format_rule enum
DO $mig$ BEGIN
  CREATE TYPE public.format_rule AS ENUM ('lowercase', 'uppercase', 'capitalize');
EXCEPTION WHEN duplicate_object THEN NULL;
END $mig$;

-- Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  format_rule format_rule NOT NULL DEFAULT 'capitalize',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read brands" ON public.brands;
CREATE POLICY "Anyone can read brands" ON public.brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
CREATE POLICY "Admins can insert brands" ON public.brands FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update brands" ON public.brands;
CREATE POLICY "Admins can update brands" ON public.brands FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete brands" ON public.brands;
CREATE POLICY "Admins can delete brands" ON public.brands FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Device Models
CREATE TABLE IF NOT EXISTS public.device_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format_rule format_rule NOT NULL DEFAULT 'capitalize',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, name)
);
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read device_models" ON public.device_models;
CREATE POLICY "Anyone can read device_models" ON public.device_models FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert device_models" ON public.device_models;
CREATE POLICY "Admins can insert device_models" ON public.device_models FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update device_models" ON public.device_models;
CREATE POLICY "Admins can update device_models" ON public.device_models FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete device_models" ON public.device_models;
CREATE POLICY "Admins can delete device_models" ON public.device_models FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Storages
CREATE TABLE IF NOT EXISTS public.storages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capacity TEXT NOT NULL UNIQUE,
  format_rule format_rule NOT NULL DEFAULT 'uppercase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read storages" ON public.storages;
CREATE POLICY "Anyone can read storages" ON public.storages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert storages" ON public.storages;
CREATE POLICY "Admins can insert storages" ON public.storages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update storages" ON public.storages;
CREATE POLICY "Admins can update storages" ON public.storages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete storages" ON public.storages;
CREATE POLICY "Admins can delete storages" ON public.storages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Colors
CREATE TABLE IF NOT EXISTS public.colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  format_rule format_rule NOT NULL DEFAULT 'capitalize',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read colors" ON public.colors;
CREATE POLICY "Anyone can read colors" ON public.colors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert colors" ON public.colors;
CREATE POLICY "Admins can insert colors" ON public.colors FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update colors" ON public.colors;
CREATE POLICY "Admins can update colors" ON public.colors FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete colors" ON public.colors;
CREATE POLICY "Admins can delete colors" ON public.colors FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
