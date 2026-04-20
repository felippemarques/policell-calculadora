-- Replace the permissive UPDATE policy with a SECURITY DEFINER RPC that only
-- the public flow uses to attach the n8n-generated coupon to an evaluation.
DROP POLICY IF EXISTS "Public can update own evaluation coupon" ON public.evaluations;

CREATE OR REPLACE FUNCTION public.attach_evaluation_coupon(
  _evaluation_id uuid,
  _coupon_code text,
  _coupon_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.evaluations
     SET coupon_code = _coupon_code,
         coupon_id   = _coupon_id,
         status      = 'completed'
   WHERE id = _evaluation_id
     AND coupon_code IS NULL; -- prevent overwriting / replay
END;
$$;

REVOKE ALL ON FUNCTION public.attach_evaluation_coupon(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.attach_evaluation_coupon(uuid, text, text) TO anon, authenticated;
