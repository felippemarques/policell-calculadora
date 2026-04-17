import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardFilters {
  from?: string; // ISO date
  to?: string;   // ISO date
  brandId?: string;
}

export interface DashboardMetrics {
  range: { from: string | null; to: string | null; brand_id: string | null };
  totals: {
    leads: number;
    incomplete: number;
    rejected: number;
    completed: number;
    total: number;
    abandonment_rate: number;
    total_value_brl: number;
  };
  top_devices: Array<{
    device_id: string;
    model: string;
    brand: string;
    count: number;
    total_value: number;
  }>;
}

export function useDashboardMetrics(filters: DashboardFilters) {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.brandId) params.set("brand_id", filters.brandId);

      const qs = params.toString();
      const path = qs ? `get-dashboard-metrics?${qs}` : "get-dashboard-metrics";

      const { data, error } = await supabase.functions.invoke(path, {
        method: "GET",
      });
      if (error) throw error;
      return data as DashboardMetrics;
    },
    staleTime: 30_000,
  });
}
