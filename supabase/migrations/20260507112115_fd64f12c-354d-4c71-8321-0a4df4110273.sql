-- Garante que o enum format_rule contenha o valor 'apple'
DO $$
BEGIN
  ALTER TYPE public.format_rule ADD VALUE IF NOT EXISTS 'apple';
EXCEPTION WHEN undefined_object THEN
  CREATE TYPE public.format_rule AS ENUM ('lowercase', 'uppercase', 'capitalize', 'apple');
END $$;

-- Remove qualquer check antigo (o enum já restringe os valores válidos)
ALTER TABLE public.device_models
  DROP CONSTRAINT IF EXISTS device_models_format_rule_check;

ALTER TABLE public.colors
  ADD COLUMN IF NOT EXISTS image_url text;
