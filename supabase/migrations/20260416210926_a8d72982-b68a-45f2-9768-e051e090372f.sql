-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  assessment_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
CREATE POLICY "Anyone can create leads" ON public.leads FOR INSERT
  TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update leads by id" ON public.leads;
CREATE POLICY "Anyone can update leads by id" ON public.leads FOR UPDATE
  TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read leads" ON public.leads;
CREATE POLICY "Admins can read leads" ON public.leads FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Lead owner can read by id" ON public.leads;
CREATE POLICY "Lead owner can read by id" ON public.leads FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);