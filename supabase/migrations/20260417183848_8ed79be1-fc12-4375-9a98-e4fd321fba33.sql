CREATE TABLE IF NOT EXISTS public.admin_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own onboarding" ON public.admin_onboarding;
CREATE POLICY "Admins can view own onboarding" ON public.admin_onboarding FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert own onboarding" ON public.admin_onboarding;
CREATE POLICY "Admins can insert own onboarding" ON public.admin_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update own onboarding" ON public.admin_onboarding;
CREATE POLICY "Admins can update own onboarding" ON public.admin_onboarding FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_admin_onboarding_updated_at ON public.admin_onboarding;
CREATE TRIGGER update_admin_onboarding_updated_at
  BEFORE UPDATE ON public.admin_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();