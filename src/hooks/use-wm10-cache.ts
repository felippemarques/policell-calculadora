// src/hooks/use-wm10-cache.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Wm10CachedProduct {
  cod_produto: number;
  cod_barra: number | null;
  nome: string;
  preco_compra: number | null;
  preco_venda: number | null;
  unidade: string | null;
  estoque: number | null;
  synced_at: string;
}

const STALE_HOURS = 24;

export function useWm10Cache({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) {
  const term = search?.trim() ?? "";

  return useQuery({
    queryKey: ["wm10-cache", page, limit, term],
    queryFn: async () => {
      let q = supabase
        .from("wm10_products_cache")
        .select("*", { count: "exact" })
        .order("nome")
        .range((page - 1) * limit, page * limit - 1);

      if (term) q = q.ilike("nome", `%${term}%`);

      const { data, error, count } = await q;
      if (error) throw error;
      return { products: (data ?? []) as Wm10CachedProduct[], total: count ?? 0 };
    },
  });
}

export function useWm10SyncMeta() {
  return useQuery({
    queryKey: ["wm10-sync-meta"],
    queryFn: async () => {
      const [syncRow, countRow] = await Promise.all([
        supabase
          .from("lp_settings")
          .select("value")
          .eq("key", "wm10_last_sync")
          .maybeSingle(),
        supabase
          .from("wm10_products_cache")
          .select("*", { count: "exact", head: true }),
      ]);

      const lastSync = syncRow.data?.value ?? "";
      const total = countRow.count ?? 0;
      const isStale =
        total === 0 ||
        !lastSync ||
        Date.now() - new Date(lastSync).getTime() > STALE_HOURS * 60 * 60 * 1000;

      return { lastSync, total, isStale };
    },
  });
}

export function useSyncWm10Cache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wm10-proxy", {
        body: { action: "sync-all" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: boolean; total: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wm10-cache"] });
      qc.invalidateQueries({ queryKey: ["wm10-sync-meta"] });
    },
  });
}
