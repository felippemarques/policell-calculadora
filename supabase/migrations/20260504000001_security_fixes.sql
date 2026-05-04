-- Fix: attach_evaluation_coupon — limita a 15 min após criação da avaliação
-- Impede que alguém com um UUID antigo anexe um cupom falso em avaliação alheia.
-- O fluxo normal leva segundos (create → n8n → attach), então 15 min é mais que suficiente.
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
     AND coupon_code IS NULL
     AND created_at > now() - interval '15 minutes';
END;
$$;
