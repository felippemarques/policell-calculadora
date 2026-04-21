-- Soft-delete + internal notes for leads and evaluations
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_notes text;

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_notes text;

CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads(archived_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_archived_at ON public.evaluations(archived_at);

-- ── Admin RPCs ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_lead(_lead_id uuid, _archive boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.leads
     SET archived_at = CASE WHEN _archive THEN now() ELSE NULL END,
         updated_at  = now()
   WHERE id = _lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_evaluation(_evaluation_id uuid, _archive boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.evaluations
     SET archived_at = CASE WHEN _archive THEN now() ELSE NULL END
   WHERE id = _evaluation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_lead_notes(_lead_id uuid, _notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.leads
     SET internal_notes = NULLIF(trim(coalesce(_notes,'')), ''),
         updated_at     = now()
   WHERE id = _lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_evaluation_notes(_evaluation_id uuid, _notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.evaluations
     SET internal_notes = NULLIF(trim(coalesce(_notes,'')), '')
   WHERE id = _evaluation_id;
END;
$$;