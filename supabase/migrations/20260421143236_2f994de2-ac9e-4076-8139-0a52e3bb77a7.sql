-- Backfill: cria as duas novas chaves de contrato (Troca e Venda) a partir do
-- texto unificado existente, sem sobrescrever caso já existam.
INSERT INTO public.lp_settings (key, value)
SELECT 'business_contract_terms_trade', COALESCE(
  (SELECT value FROM public.lp_settings WHERE key = 'business_contract_terms' LIMIT 1),
  ''
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.lp_settings WHERE key = 'business_contract_terms_trade'
);

INSERT INTO public.lp_settings (key, value)
SELECT 'business_contract_terms_sale', COALESCE(
  (SELECT value FROM public.lp_settings WHERE key = 'business_contract_terms' LIMIT 1),
  ''
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.lp_settings WHERE key = 'business_contract_terms_sale'
);