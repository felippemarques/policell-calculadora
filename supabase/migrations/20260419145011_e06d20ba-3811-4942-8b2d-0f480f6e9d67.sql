
-- ============================================================
-- 1. NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.model_storages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.device_models(id) ON DELETE CASCADE,
  storage_id uuid NOT NULL REFERENCES public.storages(id) ON DELETE RESTRICT,
  base_price numeric NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, storage_id)
);

CREATE TABLE IF NOT EXISTS public.variant_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_storage_id uuid NOT NULL REFERENCES public.model_storages(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES public.colors(id) ON DELETE RESTRICT,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_storage_id, color_id)
);

CREATE INDEX IF NOT EXISTS idx_model_storages_model ON public.model_storages(model_id);
CREATE INDEX IF NOT EXISTS idx_variant_colors_ms ON public.variant_colors(model_storage_id);

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.model_storages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read model_storages" ON public.model_storages;
CREATE POLICY "Anyone can read model_storages" ON public.model_storages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert model_storages" ON public.model_storages;
CREATE POLICY "Admins can insert model_storages" ON public.model_storages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update model_storages" ON public.model_storages;
CREATE POLICY "Admins can update model_storages" ON public.model_storages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete model_storages" ON public.model_storages;
CREATE POLICY "Admins can delete model_storages" ON public.model_storages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can read variant_colors" ON public.variant_colors;
CREATE POLICY "Anyone can read variant_colors" ON public.variant_colors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert variant_colors" ON public.variant_colors;
CREATE POLICY "Admins can insert variant_colors" ON public.variant_colors FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update variant_colors" ON public.variant_colors;
CREATE POLICY "Admins can update variant_colors" ON public.variant_colors FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete variant_colors" ON public.variant_colors;
CREATE POLICY "Admins can delete variant_colors" ON public.variant_colors FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. SYNC FUNCTION + TRIGGERS → keeps public.devices in sync
-- ============================================================
-- Strategy: each model_storage row maps to ONE devices row.
-- We store the model_storage_id inside devices.id so lookups are O(1).

CREATE OR REPLACE FUNCTION public.sync_device_for_model_storage(_ms_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _model_id uuid;
  _storage_id uuid;
  _base_price numeric;
  _model_name text;
  _brand_id uuid;
  _brand_name text;
  _storage_capacity text;
  _colors_csv text;
BEGIN
  SELECT ms.model_id, ms.storage_id, ms.base_price
    INTO _model_id, _storage_id, _base_price
    FROM public.model_storages ms WHERE ms.id = _ms_id;

  IF _model_id IS NULL THEN
    -- model_storage was deleted → remove device
    DELETE FROM public.devices WHERE id = _ms_id;
    RETURN;
  END IF;

  SELECT dm.name, dm.brand_id INTO _model_name, _brand_id
    FROM public.device_models dm WHERE dm.id = _model_id;
  SELECT b.name INTO _brand_name FROM public.brands b WHERE b.id = _brand_id;
  SELECT s.capacity INTO _storage_capacity FROM public.storages s WHERE s.id = _storage_id;

  SELECT string_agg(c.name, ',' ORDER BY vc.display_order, c.name)
    INTO _colors_csv
    FROM public.variant_colors vc
    JOIN public.colors c ON c.id = vc.color_id
   WHERE vc.model_storage_id = _ms_id;

  INSERT INTO public.devices (id, brand, brand_id, model, storage, colors, base_price)
  VALUES (_ms_id, COALESCE(_brand_name, 'Apple'), _brand_id, COALESCE(_model_name, ''), COALESCE(_storage_capacity, ''), _colors_csv, _base_price)
  ON CONFLICT (id) DO UPDATE
    SET brand = EXCLUDED.brand,
        brand_id = EXCLUDED.brand_id,
        model = EXCLUDED.model,
        storage = EXCLUDED.storage,
        colors = EXCLUDED.colors,
        base_price = EXCLUDED.base_price;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_devices_from_ms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.devices WHERE id = OLD.id;
    RETURN OLD;
  ELSE
    PERFORM public.sync_device_for_model_storage(NEW.id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_devices_from_vc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_device_for_model_storage(OLD.model_storage_id);
    RETURN OLD;
  ELSE
    PERFORM public.sync_device_for_model_storage(NEW.model_storage_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS sync_devices_ms_aiud ON public.model_storages;
CREATE TRIGGER sync_devices_ms_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.model_storages
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_devices_from_ms();

DROP TRIGGER IF EXISTS sync_devices_vc_aiud ON public.variant_colors;
CREATE TRIGGER sync_devices_vc_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.variant_colors
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_devices_from_vc();

-- ============================================================
-- 4. BACKFILL from existing devices
-- ============================================================
DO $$
DECLARE
  d record;
  _brand_id uuid;
  _model_id uuid;
  _storage_id uuid;
  _ms_id uuid;
  _color_id uuid;
  _color_name text;
BEGIN
  FOR d IN SELECT * FROM public.devices LOOP
    -- brand
    SELECT id INTO _brand_id FROM public.brands
     WHERE lower(trim(name)) = lower(trim(d.brand)) LIMIT 1;
    IF _brand_id IS NULL THEN
      INSERT INTO public.brands (name) VALUES (d.brand) RETURNING id INTO _brand_id;
    END IF;

    -- model
    SELECT id INTO _model_id FROM public.device_models
     WHERE brand_id = _brand_id AND lower(trim(name)) = lower(trim(d.model)) LIMIT 1;
    IF _model_id IS NULL THEN
      INSERT INTO public.device_models (brand_id, name) VALUES (_brand_id, d.model) RETURNING id INTO _model_id;
    END IF;

    -- storage
    SELECT id INTO _storage_id FROM public.storages
     WHERE lower(trim(capacity)) = lower(trim(d.storage)) LIMIT 1;
    IF _storage_id IS NULL THEN
      INSERT INTO public.storages (capacity) VALUES (d.storage) RETURNING id INTO _storage_id;
    END IF;

    -- model_storage (reuse existing device.id so trigger maps 1:1)
    SELECT id INTO _ms_id FROM public.model_storages
     WHERE model_id = _model_id AND storage_id = _storage_id LIMIT 1;
    IF _ms_id IS NULL THEN
      INSERT INTO public.model_storages (id, model_id, storage_id, base_price)
      VALUES (d.id, _model_id, _storage_id, d.base_price)
      RETURNING id INTO _ms_id;
    END IF;

    -- colors (CSV)
    IF d.colors IS NOT NULL AND length(trim(d.colors)) > 0 THEN
      FOR _color_name IN
        SELECT trim(unnest(string_to_array(d.colors, ',')))
      LOOP
        IF _color_name = '' THEN CONTINUE; END IF;
        SELECT id INTO _color_id FROM public.colors
         WHERE lower(trim(name)) = lower(_color_name) LIMIT 1;
        IF _color_id IS NULL THEN
          INSERT INTO public.colors (name) VALUES (_color_name) RETURNING id INTO _color_id;
        END IF;
        INSERT INTO public.variant_colors (model_storage_id, color_id)
        VALUES (_ms_id, _color_id)
        ON CONFLICT (model_storage_id, color_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;
