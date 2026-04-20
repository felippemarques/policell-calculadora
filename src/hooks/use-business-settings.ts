import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessSettings {
  showRealtimeDeductions: boolean;
  upgradeBonusPercent: number;
}

const KEYS = [
  "business_show_realtime_deductions",
  "business_upgrade_bonus_percent",
] as const;

export const BUSINESS_SETTINGS_KEY = ["business-settings-public"] as const;

export function useBusinessSettings() {
  return useQuery({
    queryKey: BUSINESS_SETTINGS_KEY,
    queryFn: async (): Promise<BusinessSettings> => {
      const { data, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", KEYS as unknown as string[]);
      if (error) throw error;

      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        map[row.key] = row.value;
      });

      return {
        // Default: true (mostrar) — só esconde se admin desativar explicitamente.
        showRealtimeDeductions: (map.business_show_realtime_deductions ?? "true") !== "false",
        upgradeBonusPercent: Number(map.business_upgrade_bonus_percent ?? "0") || 0,
      };
    },
  });
}
