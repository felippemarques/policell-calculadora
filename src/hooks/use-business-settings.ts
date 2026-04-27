import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessSettings {
  showRealtimeDeductions: boolean;
  upgradeBonusPercent: number;
  /** When true, damage options that block the evaluation show the "Inviabiliza" badge. */
  showRejectLabel: boolean;
  /** When true, damage options worth R$ 0 show the "Sem dedução" badge. */
  showNoDeductionLabel: boolean;
}

const KEYS = [
  "business_show_realtime_deductions",
  "business_upgrade_bonus_percent",
  "business_show_reject_label",
  "business_show_no_deduction_label",
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
        showRejectLabel: (map.business_show_reject_label ?? "true") !== "false",
        showNoDeductionLabel: (map.business_show_no_deduction_label ?? "true") !== "false",
      };
    },
  });
}
