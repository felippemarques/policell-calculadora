CREATE OR REPLACE FUNCTION public.normalize_phone(_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.is_valid_imei(_imei TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.validate_evaluation_imei()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.imei IS NOT NULL AND NEW.imei <> '' THEN
    IF NOT public.is_valid_imei(NEW.imei) THEN
      RAISE EXCEPTION 'IMEI inválido: %', NEW.imei
        USING ERRCODE = '22023';
    END IF;
    NEW.imei := regexp_replace(NEW.imei, '\D', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;