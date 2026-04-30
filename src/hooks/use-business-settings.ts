import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessSettings {
  showRealtimeDeductions: boolean;
  upgradeBonusPercent: number;
  /** Bônus aplicado quando o cliente escolhe o fluxo "Vender por dinheiro". */
  saleBonusPercent: number;
  /** Dias até uma proposta com o mesmo IMEI poder ser refeita. 0 = nunca expira. */
  proposalExpirationDays: number;
  /** WhatsApp comercial usado na mensagem de IMEI duplicado (fallback: flow_sale_whatsapp). */
  commercialWhatsapp: string;
  /** When true, damage options that block the evaluation show the "Inviabiliza" badge. */
  showRejectLabel: boolean;
  /** When true, damage options worth R$ 0 show the "Sem dedução" badge. */
  showNoDeductionLabel: boolean;
  /** When true, the device base price is shown on the storage/color selection screens (promotional mode). */
  showDeviceBasePrice: boolean;
}

const KEYS = [
  "business_show_realtime_deductions",
  "business_upgrade_bonus_percent",
  "business_sale_bonus_percent",
  "business_proposal_expiration_days",
  "business_commercial_whatsapp",
  "business_show_reject_label",
  "business_show_no_deduction_label",
  "business_show_device_base_price",
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
        showRealtimeDeductions: (map.business_show_realtime_deductions ?? "true") !== "false",
        upgradeBonusPercent: Number(map.business_upgrade_bonus_percent ?? "0") || 0,
        saleBonusPercent: Number(map.business_sale_bonus_percent ?? "0") || 0,
        proposalExpirationDays: Number(map.business_proposal_expiration_days ?? "30") || 0,
        commercialWhatsapp: (map.business_commercial_whatsapp ?? "").trim(),
        showRejectLabel: (map.business_show_reject_label ?? "true") !== "false",
        showNoDeductionLabel: (map.business_show_no_deduction_label ?? "true") !== "false",
        showDeviceBasePrice: (map.business_show_device_base_price ?? "false") === "true",
      };
    },
  });
}
