-- 1. Trocar UPDATE público em leads por uma RPC controlada
DROP POLICY IF EXISTS "Anyone can update leads by id" ON public.leads;

CREATE OR REPLACE FUNCTION public.update_lead_progress(
  _lead_id uuid,
  _device_id uuid DEFAULT NULL,
  _assessment_responses jsonb DEFAULT NULL,
  _status text DEFAULT NULL,
  _rejection_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só aceita os status válidos do fluxo
  IF _status IS NOT NULL AND _status NOT IN ('in_progress','rejected','completed') THEN
    RAISE EXCEPTION 'invalid status: %', _status;
  END IF;

  UPDATE public.leads
     SET device_id            = COALESCE(_device_id, device_id),
         assessment_responses = COALESCE(_assessment_responses, assessment_responses),
         status               = COALESCE(_status, status),
         rejection_reason     = COALESCE(_rejection_reason, rejection_reason),
         updated_at           = now()
   WHERE id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_lead_progress(uuid, uuid, jsonb, text, text)
  TO anon, authenticated;

-- 2. Bloquear escrita em user_roles (RESTRICTIVE = sempre aplica)
CREATE POLICY "Block all writes to user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
