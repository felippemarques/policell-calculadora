-- Add CPF field to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_cpf TEXT;

-- SECURITY DEFINER RPC so anonymous users (public calculator) can save CPF
-- without needing direct UPDATE permission on the leads table.
CREATE OR REPLACE FUNCTION update_lead_cpf(_lead_id uuid, _cpf text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads
  SET customer_cpf = _cpf,
      updated_at   = now()
  WHERE id = _lead_id;
END;
$$;

REVOKE ALL ON FUNCTION update_lead_cpf(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_lead_cpf(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION update_lead_cpf(uuid, text) TO authenticated;
