import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlowConfig {
  enabled: boolean;
  title: string;
  description: string;
  ctaText: string;
}

export interface FlowSettings {
  trade: FlowConfig;
  sale: FlowConfig & { whatsapp: string };
  /** True when at least one flow is enabled. */
  anyEnabled: boolean;
  /** When only one flow is enabled, returns its key — caller should auto-select. */
  onlyEnabled: "trade" | "sale" | null;
}

const FLOW_KEYS = [
  "flow_trade_enabled",
  "flow_trade_title",
  "flow_trade_description",
  "flow_trade_cta_text",
  "flow_sale_enabled",
  "flow_sale_title",
  "flow_sale_description",
  "flow_sale_cta_text",
  "flow_sale_whatsapp",
] as const;

const DEFAULTS: Record<(typeof FLOW_KEYS)[number], string> = {
  flow_trade_enabled: "true",
  flow_trade_title: "Trocar por outro aparelho",
  flow_trade_description:
    "Use o valor do seu aparelho como crédito para comprar um novo na nossa loja.",
  flow_trade_cta_text: "Quero trocar",
  flow_sale_enabled: "true",
  flow_sale_title: "Vender por dinheiro",
  flow_sale_description:
    "Receba o valor do seu aparelho em dinheiro via PIX ou transferência.",
  flow_sale_cta_text: "Quero vender",
  flow_sale_whatsapp: "",
};

export const FLOW_SETTINGS_KEY = ["flow-settings"] as const;

export function useFlowSettings() {
  return useQuery({
    queryKey: FLOW_SETTINGS_KEY,
    queryFn: async (): Promise<FlowSettings> => {
      const { data, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", FLOW_KEYS as unknown as string[]);
      if (error) throw error;

      const map: Record<string, string> = { ...DEFAULTS };
      (data || []).forEach((row: any) => {
        if ((FLOW_KEYS as readonly string[]).includes(row.key)) {
          map[row.key] = row.value ?? DEFAULTS[row.key as keyof typeof DEFAULTS];
        }
      });

      const trade: FlowConfig = {
        enabled: map.flow_trade_enabled === "true",
        title: map.flow_trade_title,
        description: map.flow_trade_description,
        ctaText: map.flow_trade_cta_text,
      };
      const sale = {
        enabled: map.flow_sale_enabled === "true",
        title: map.flow_sale_title,
        description: map.flow_sale_description,
        ctaText: map.flow_sale_cta_text,
        whatsapp: map.flow_sale_whatsapp,
      };

      const anyEnabled = trade.enabled || sale.enabled;
      const onlyEnabled =
        trade.enabled && !sale.enabled
          ? "trade"
          : !trade.enabled && sale.enabled
            ? "sale"
            : null;

      return { trade, sale, anyEnabled, onlyEnabled };
    },
  });
}
