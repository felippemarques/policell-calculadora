-- Cache local de produtos do WM10
CREATE TABLE public.wm10_products_cache (
  cod_produto   integer PRIMARY KEY,
  cod_barra     integer,
  nome          text    NOT NULL DEFAULT '',
  preco_compra  numeric,
  preco_venda   numeric,
  unidade       text,
  estoque       integer,
  synced_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wm10_products_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_wm10_cache"
  ON public.wm10_products_cache
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Índice para busca por nome
CREATE INDEX wm10_products_cache_nome_idx
  ON public.wm10_products_cache USING gin (to_tsvector('simple', nome));

-- Timestamp do último sync
INSERT INTO public.lp_settings (key, value)
  VALUES ('wm10_last_sync', '')
  ON CONFLICT (key) DO NOTHING;
