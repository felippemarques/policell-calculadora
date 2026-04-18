ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS coupon_id TEXT NULL;
