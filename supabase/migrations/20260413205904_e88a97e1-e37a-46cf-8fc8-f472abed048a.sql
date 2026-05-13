
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL DEFAULT 'Apple',
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  colors TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.damage_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.damage_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  damage_category_id UUID NOT NULL REFERENCES public.damage_categories(id) ON DELETE CASCADE,
  deduction_value NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.condition_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condition_name TEXT NOT NULL UNIQUE,
  discount_percentage NUMERIC(5,2) NOT NULL,
  is_rejected BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_id UUID NOT NULL REFERENCES public.devices(id),
  device_condition TEXT NOT NULL,
  damages JSONB NOT NULL DEFAULT '[]',
  base_price NUMERIC(10,2) NOT NULL,
  condition_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_value NUMERIC(10,2) NOT NULL,
  coupon_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read devices" ON public.devices;
CREATE POLICY "Anyone can read devices" ON public.devices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can read damage_categories" ON public.damage_categories;
CREATE POLICY "Anyone can read damage_categories" ON public.damage_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can read damage_deductions" ON public.damage_deductions;
CREATE POLICY "Anyone can read damage_deductions" ON public.damage_deductions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can read condition_discounts" ON public.condition_discounts;
CREATE POLICY "Anyone can read condition_discounts" ON public.condition_discounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create evaluations" ON public.evaluations;
CREATE POLICY "Anyone can create evaluations" ON public.evaluations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can read evaluations" ON public.evaluations;
CREATE POLICY "Anyone can read evaluations" ON public.evaluations FOR SELECT USING (true);
