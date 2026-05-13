ALTER TABLE public.device_models
  DROP CONSTRAINT IF EXISTS device_models_format_rule_check;

ALTER TABLE public.device_models
  DROP CONSTRAINT IF EXISTS device_models_format_rule_check;
ALTER TABLE public.device_models
  ADD CONSTRAINT device_models_format_rule_check
  CHECK (format_rule = ANY (ARRAY['lowercase'::text, 'uppercase'::text, 'capitalize'::text, 'apple'::text]));

ALTER TABLE public.colors
  ADD COLUMN IF NOT EXISTS image_url text;