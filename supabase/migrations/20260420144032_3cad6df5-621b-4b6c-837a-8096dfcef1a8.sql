-- Adiciona suporte a IMEI nos leads e nas avaliações (cupons),
-- e cria índices para a visão por cliente agrupada por telefone.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS imei TEXT;

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS imei TEXT;

-- Função utilitária: normaliza telefone (remove tudo que não é dígito).
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
$$;

-- Função: valida formato e dígito Luhn de um IMEI de 15 dígitos.
CREATE OR REPLACE FUNCTION public.is_valid_imei(_imei TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
  total INT := 0;
  d INT;
  i INT;
  doubled INT;
BEGIN
  IF _imei IS NULL THEN RETURN FALSE; END IF;
  digits := regexp_replace(_imei, '\D', '', 'g');
  IF length(digits) <> 15 THEN RETURN FALSE; END IF;
  FOR i IN 1..15 LOOP
    d := substring(digits FROM i FOR 1)::INT;
    IF i % 2 = 0 THEN
      doubled := d * 2;
      IF doubled > 9 THEN doubled := doubled - 9; END IF;
      total := total + doubled;
    ELSE
      total := total + d;
    END IF;
  END LOOP;
  RETURN total % 10 = 0;
END;
$$;

-- Garante que IMEI em avaliações concluídas seja válido (formato + Luhn).
CREATE OR REPLACE FUNCTION public.validate_evaluation_imei()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.imei IS NOT NULL AND NEW.imei <> '' THEN
    IF NOT public.is_valid_imei(NEW.imei) THEN
      RAISE EXCEPTION 'IMEI inválido: %', NEW.imei
        USING ERRCODE = '22023';
    END IF;
    -- Normaliza para apenas dígitos
    NEW.imei := regexp_replace(NEW.imei, '\D', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_evaluation_imei ON public.evaluations;
DROP TRIGGER IF EXISTS trg_validate_evaluation_imei ON public.evaluations;
CREATE TRIGGER trg_validate_evaluation_imei
BEFORE INSERT OR UPDATE OF imei ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.validate_evaluation_imei();

-- Bloqueia duplicidade: mesmo IMEI + mesmo flow_type não pode ter
-- mais de uma avaliação concluída/com cupom.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_evaluations_imei_flow_active
ON public.evaluations (imei, flow_type)
WHERE imei IS NOT NULL AND status IN ('pending','approved','completed');

-- Índices úteis para a visão por cliente (telefone normalizado).
CREATE INDEX IF NOT EXISTS idx_leads_phone_norm
  ON public.leads ((public.normalize_phone(customer_phone)));
CREATE INDEX IF NOT EXISTS idx_evaluations_phone_norm
  ON public.evaluations ((public.normalize_phone(customer_phone)));

-- Permitir que o cliente público atualize o IMEI do próprio lead durante o fluxo.
-- Mantém demais campos protegidos via RPC update_lead_progress.
CREATE OR REPLACE FUNCTION public.update_lead_imei(_lead_id UUID, _imei TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _imei IS NULL OR _imei = '' THEN
    RAISE EXCEPTION 'IMEI obrigatório' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_valid_imei(_imei) THEN
    RAISE EXCEPTION 'IMEI inválido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.leads
     SET imei = regexp_replace(_imei, '\D', '', 'g'),
         updated_at = now()
   WHERE id = _lead_id;
END;
$$;