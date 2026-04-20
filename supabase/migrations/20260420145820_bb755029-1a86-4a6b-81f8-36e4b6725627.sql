-- Add LGPD/terms acceptance fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- RPC to register acceptance from anonymous users
CREATE OR REPLACE FUNCTION public.accept_lead_terms(_lead_id uuid, _version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _lead_id IS NULL THEN
    RAISE EXCEPTION 'lead_id obrigatório' USING ERRCODE = '22023';
  END IF;
  UPDATE public.leads
     SET terms_accepted_at = now(),
         terms_version     = COALESCE(NULLIF(_version, ''), 'v1'),
         updated_at        = now()
   WHERE id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_lead_terms(uuid, text) TO anon, authenticated;