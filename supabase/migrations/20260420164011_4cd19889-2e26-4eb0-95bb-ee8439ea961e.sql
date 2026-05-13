-- Drop the existing public-insert policy (it was created without explicit roles
-- which caused issues for anonymous users) and recreate it explicitly for
-- both anon and authenticated roles.
DROP POLICY IF EXISTS "Anyone can create evaluations" ON public.evaluations;

DROP POLICY IF EXISTS "Public can create evaluations" ON public.evaluations;
CREATE POLICY "Public can create evaluations" ON public.evaluations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also ensure the update done after n8n call works for the anonymous flow
-- (we update coupon_code/coupon_id/status by evaluation id right after insert).
DROP POLICY IF EXISTS "Public can update own evaluation coupon" ON public.evaluations;

DROP POLICY IF EXISTS "Public can update own evaluation coupon" ON public.evaluations;
CREATE POLICY "Public can update own evaluation coupon" ON public.evaluations
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
