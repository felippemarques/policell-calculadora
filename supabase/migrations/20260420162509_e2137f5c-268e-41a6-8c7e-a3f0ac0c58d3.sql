-- 1) Address columns + contract acceptance on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS contract_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_version text;

-- 2) RPC to update address (publicly callable, mirrors other lead RPCs)
CREATE OR REPLACE FUNCTION public.update_lead_address(
  _lead_id uuid,
  _zip text,
  _street text,
  _number text,
  _complement text,
  _neighborhood text,
  _city text,
  _state text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _lead_id IS NULL THEN
    RAISE EXCEPTION 'lead_id obrigatório' USING ERRCODE = '22023';
  END IF;
  UPDATE public.leads
     SET address_zip          = NULLIF(regexp_replace(coalesce(_zip,''), '\D', '', 'g'), ''),
         address_street       = NULLIF(trim(coalesce(_street,'')), ''),
         address_number       = NULLIF(trim(coalesce(_number,'')), ''),
         address_complement   = NULLIF(trim(coalesce(_complement,'')), ''),
         address_neighborhood = NULLIF(trim(coalesce(_neighborhood,'')), ''),
         address_city         = NULLIF(trim(coalesce(_city,'')), ''),
         address_state        = NULLIF(upper(trim(coalesce(_state,''))), ''),
         updated_at           = now()
   WHERE id = _lead_id;
END;
$$;

-- 3) RPC to register contract acceptance
CREATE OR REPLACE FUNCTION public.accept_lead_contract(
  _lead_id uuid,
  _version text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _lead_id IS NULL THEN
    RAISE EXCEPTION 'lead_id obrigatório' USING ERRCODE = '22023';
  END IF;
  UPDATE public.leads
     SET contract_accepted_at = now(),
         contract_version     = COALESCE(NULLIF(_version, ''), 'v1'),
         updated_at           = now()
   WHERE id = _lead_id;
END;
$$;

-- 4) Default contract template setting (admin can edit later)
INSERT INTO public.lp_settings (key, value)
VALUES (
  'business_contract_template',
  E'CONTRATO DE INTENÇÃO DE TROCA / VENDA DE APARELHO USADO\n\nEntre as partes:\n- LOJA: {{store_name}}\n- CLIENTE: {{customer_name}} — CPF/Email: {{customer_email}} — Telefone: {{customer_phone}}\n- ENDEREÇO DO CLIENTE: {{customer_address}}\n\nAparelho ofertado pelo CLIENTE:\n- Modelo: {{device_label}}\n- IMEI: {{imei}}\n- Estado declarado: conforme avaliação respondida\n\nProposta gerada pela calculadora:\n- Valor base: R$ {{base_price}}\n- Deduções aplicadas: R$ {{deductions}}\n- Bônus de upgrade (apenas troca): {{bonus_percent}}%\n- VALOR FINAL DA PROPOSTA: R$ {{final_value}}\n- Modalidade: {{flow_label}}\n\nO CLIENTE declara que as informações fornecidas são verdadeiras. O valor é uma proposta inicial e está sujeito a inspeção física do aparelho. A LOJA poderá ajustar o valor caso a inspeção identifique condições não declaradas.\n\nAceite registrado eletronicamente em {{accepted_at}}.'
)
ON CONFLICT (key) DO NOTHING;