ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_device_id_fkey;

ALTER TABLE public.evaluations
  ALTER COLUMN device_id DROP NOT NULL;

ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_device_id_fkey;
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_device_id_fkey
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;