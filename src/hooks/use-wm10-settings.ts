import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Wm10Settings {
  store_url: string;
  cnpj: string;
  token: string;
  enabled: boolean;
}

const WM10_KEYS = ["wm10_store_url", "wm10_cnpj", "wm10_token", "wm10_enabled"] as const;

async function fetchWm10Settings(): Promise<Wm10Settings> {
  const { data, error } = await supabase
    .from("lp_settings")
    .select("key, value")
    .in("key", WM10_KEYS);
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    store_url: map["wm10_store_url"] ?? "",
    cnpj: map["wm10_cnpj"] ?? "",
    token: map["wm10_token"] ?? "",
    enabled: map["wm10_enabled"] === "true",
  };
}

async function saveWm10Settings(s: Wm10Settings): Promise<void> {
  const rows = [
    { key: "wm10_store_url", value: s.store_url },
    { key: "wm10_cnpj", value: s.cnpj },
    { key: "wm10_token", value: s.token },
    { key: "wm10_enabled", value: String(s.enabled) },
  ];
  const { error } = await supabase.from("lp_settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

export function useWm10Settings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["wm10-settings"],
    queryFn: fetchWm10Settings,
  });

  const mutation = useMutation({
    mutationFn: saveWm10Settings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wm10-settings"] }),
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
