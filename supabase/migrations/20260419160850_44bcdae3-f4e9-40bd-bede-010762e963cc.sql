-- 1. Add price columns to model_storages
ALTER TABLE public.model_storages
  ADD COLUMN IF NOT EXISTS trade_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0;

-- Backfill from base_price
UPDATE public.model_storages
   SET trade_price = base_price,
       sale_price  = base_price
 WHERE trade_price = 0 AND sale_price = 0;

-- 2. Add price columns to devices (kept in sync via trigger)
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS trade_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0;

UPDATE public.devices
   SET trade_price = base_price,
       sale_price  = base_price
 WHERE trade_price = 0 AND sale_price = 0;

-- 3. Add flow_type to leads and evaluations
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS flow_type text NOT NULL DEFAULT 'trade';

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS flow_type text NOT NULL DEFAULT 'trade';

-- 4. Update sync function to propagate trade_price / sale_price
CREATE OR REPLACE FUNCTION public.sync_device_for_model_storage(_ms_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _model_id uuid;
  _storage_id uuid;
  _base_price numeric;
  _trade_price numeric;
  _sale_price numeric;
  _model_name text;
  _brand_id uuid;
  _brand_name text;
  _storage_capacity text;
  _colors_csv text;
BEGIN
  SELECT ms.model_id, ms.storage_id, ms.base_price, ms.trade_price, ms.sale_price
    INTO _model_id, _storage_id, _base_price, _trade_price, _sale_price
    FROM public.model_storages ms WHERE ms.id = _ms_id;

  IF _model_id IS NULL THEN
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

  INSERT INTO public.devices (id, brand, brand_id, model, storage, colors, base_price, trade_price, sale_price)
  VALUES (_ms_id, COALESCE(_brand_name, 'Apple'), _brand_id, COALESCE(_model_name, ''), COALESCE(_storage_capacity, ''), _colors_csv, _base_price, COALESCE(_trade_price, _base_price), COALESCE(_sale_price, _base_price))
  ON CONFLICT (id) DO UPDATE
    SET brand       = EXCLUDED.brand,
        brand_id    = EXCLUDED.brand_id,
        model       = EXCLUDED.model,
        storage     = EXCLUDED.storage,
        colors      = EXCLUDED.colors,
        base_price  = EXCLUDED.base_price,
        trade_price = EXCLUDED.trade_price,
        sale_price  = EXCLUDED.sale_price;
END;
$function$;