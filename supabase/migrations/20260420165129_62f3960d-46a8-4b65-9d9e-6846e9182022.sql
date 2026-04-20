CREATE OR REPLACE FUNCTION public.create_public_evaluation(
  _customer_name text,
  _customer_email text,
  _customer_phone text,
  _device_id uuid,
  _device_condition text,
  _damages jsonb,
  _base_price numeric,
  _condition_discount numeric,
  _total_deductions numeric,
  _final_value numeric,
  _flow_type text,
  _imei text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  INSERT INTO public.evaluations (
    customer_name,
    customer_email,
    customer_phone,
    device_id,
    device_condition,
    damages,
    base_price,
    condition_discount,
    total_deductions,
    final_value,
    coupon_code,
    status,
    flow_type,
    imei
  )
  VALUES (
    COALESCE(NULLIF(trim(_customer_name), ''), 'Cliente'),
    COALESCE(NULLIF(trim(_customer_email), ''), ''),
    COALESCE(NULLIF(trim(_customer_phone), ''), ''),
    _device_id,
    COALESCE(NULLIF(trim(_device_condition), ''), 'normal'),
    COALESCE(_damages, '[]'::jsonb),
    COALESCE(_base_price, 0),
    COALESCE(_condition_discount, 0),
    COALESCE(_total_deductions, 0),
    COALESCE(_final_value, 0),
    NULL,
    'pending',
    COALESCE(NULLIF(trim(_flow_type), ''), 'trade'),
    NULLIF(trim(COALESCE(_imei, '')), '')
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_evaluation(
  text, text, text, uuid, text, jsonb, numeric, numeric, numeric, numeric, text, text
) FROM public;

GRANT EXECUTE ON FUNCTION public.create_public_evaluation(
  text, text, text, uuid, text, jsonb, numeric, numeric, numeric, numeric, text, text
) TO anon, authenticated;