-- 1) Remove índice estático de unicidade por IMEI+flow
DROP INDEX IF EXISTS public.uniq_evaluations_imei_flow_active;

-- 2) Função de validação dinâmica que respeita expiração configurável
CREATE OR REPLACE FUNCTION public.check_imei_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exp_days int;
  _exp_raw  text;
  _exists   uuid;
BEGIN
  IF NEW.imei IS NULL OR NEW.imei = '' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO _exp_raw
    FROM public.lp_settings
   WHERE key = 'business_proposal_expiration_days'
   LIMIT 1;

  BEGIN
    _exp_days := COALESCE(NULLIF(_exp_raw, '')::int, 30);
  EXCEPTION WHEN OTHERS THEN
    _exp_days := 30;
  END;

  SELECT id INTO _exists
    FROM public.evaluations
   WHERE imei = NEW.imei
     AND flow_type = NEW.flow_type
     AND archived_at IS NULL
     AND status IN ('pending','approved','completed')
     AND (_exp_days <= 0 OR created_at > now() - (_exp_days || ' days')::interval)
   LIMIT 1;

  IF _exists IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe proposta ativa para este IMEI'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trg_check_imei_duplicate ON public.evaluations;
CREATE TRIGGER trg_check_imei_duplicate
BEFORE INSERT ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.check_imei_duplicate();

-- 4) RPC público para consultar uma proposta existente bloqueando o IMEI
CREATE OR REPLACE FUNCTION public.find_active_imei_proposal(_imei text, _flow_type text)
RETURNS TABLE(id uuid, created_at timestamptz, expires_at timestamptz, flow_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exp_days int;
  _exp_raw  text;
  _digits   text;
BEGIN
  _digits := regexp_replace(coalesce(_imei,''), '\D', '', 'g');
  IF _digits = '' THEN RETURN; END IF;

  SELECT value INTO _exp_raw
    FROM public.lp_settings
   WHERE key = 'business_proposal_expiration_days'
   LIMIT 1;

  BEGIN
    _exp_days := COALESCE(NULLIF(_exp_raw, '')::int, 30);
  EXCEPTION WHEN OTHERS THEN
    _exp_days := 30;
  END;

  RETURN QUERY
    SELECT e.id,
           e.created_at,
           CASE WHEN _exp_days <= 0
                THEN NULL::timestamptz
                ELSE e.created_at + (_exp_days || ' days')::interval
           END AS expires_at,
           e.flow_type
      FROM public.evaluations e
     WHERE e.imei = _digits
       AND e.flow_type = _flow_type
       AND e.archived_at IS NULL
       AND e.status IN ('pending','approved','completed')
       AND (_exp_days <= 0 OR e.created_at > now() - (_exp_days || ' days')::interval)
     ORDER BY e.created_at DESC
     LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_active_imei_proposal(text, text) TO anon, authenticated;