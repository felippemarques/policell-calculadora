// src/hooks/use-wm10-products.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Wm10Product {
  cod_produto: number;
  cod_barra?: number;
  nome: string;
  preco_compra?: number;
  preco_venda?: number;
  unidade?: string;
  estoque?: number;
}

interface UseWm10ProductsOptions {
  page: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}

async function fetchWm10Products(page: number, limit: number, search?: string): Promise<Wm10Product[]> {
  const { data, error } = await supabase.functions.invoke("wm10-proxy", {
    body: { action: "produtos", page, limit, ...(search ? { search } : {}) },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.data ?? []) as Wm10Product[];
}

export function useWm10Products({ page, limit, search, enabled = true }: UseWm10ProductsOptions) {
  const query = useQuery({
    queryKey: ["wm10-products", page, limit, search ?? ""],
    queryFn: () => fetchWm10Products(page, limit, search),
    enabled,
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
