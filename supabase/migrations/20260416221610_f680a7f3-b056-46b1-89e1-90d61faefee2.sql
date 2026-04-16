-- Tabela de critérios (perguntas)
CREATE TABLE public.assessment_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de opções de resposta
CREATE TABLE public.assessment_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criterion_id UUID NOT NULL REFERENCES public.assessment_criteria(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  discount_fixed NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  is_rejected BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_options_criterion ON public.assessment_options(criterion_id);

-- RLS
ALTER TABLE public.assessment_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_options ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "Anyone can read assessment_criteria"
ON public.assessment_criteria FOR SELECT USING (true);

CREATE POLICY "Anyone can read assessment_options"
ON public.assessment_options FOR SELECT USING (true);

-- Admins gerenciam critérios
CREATE POLICY "Admins can insert assessment_criteria"
ON public.assessment_criteria FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update assessment_criteria"
ON public.assessment_criteria FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete assessment_criteria"
ON public.assessment_criteria FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins gerenciam opções
CREATE POLICY "Admins can insert assessment_options"
ON public.assessment_options FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update assessment_options"
ON public.assessment_options FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete assessment_options"
ON public.assessment_options FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_assessment_criteria_updated_at
BEFORE UPDATE ON public.assessment_criteria
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();