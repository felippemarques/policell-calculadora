-- Wipe operational data, keep admin users + roles + profiles intact.
-- Order matters only where FKs exist; we use TRUNCATE CASCADE to be safe.

TRUNCATE TABLE
  public.evaluations,
  public.leads,
  public.devices,
  public.device_models,
  public.brands,
  public.storages,
  public.colors,
  public.assessment_options,
  public.assessment_criteria,
  public.damage_deductions,
  public.damage_categories,
  public.condition_discounts,
  public.lp_videos,
  public.lp_sections,
  public.lp_settings,
  public.admin_onboarding
RESTART IDENTITY CASCADE;