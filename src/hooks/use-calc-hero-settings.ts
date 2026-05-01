import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CALC_HERO_KEYS = [
  "calc_hero_bg_image",
  "calc_hero_bg_color",
  "calc_hero_text_color",
  "calc_hero_title",
  "calc_hero_subtitle",
  "flow_trade_icon_url",
  "flow_trade_card_bg",
  "flow_sale_icon_url",
  "flow_sale_card_bg",
] as const;

export type CalcHeroKey = (typeof CALC_HERO_KEYS)[number];

export const CALC_HERO_DEFAULTS: Record<CalcHeroKey, string> = {
  calc_hero_bg_image: "",
  calc_hero_bg_color: "",
  calc_hero_text_color: "",
  calc_hero_title: "Policell - Garantia de entrega e qualidade",
  calc_hero_subtitle: "Seu aparelho vale mais do que você imagina.",
  flow_trade_icon_url: "",
  flow_trade_card_bg: "",
  flow_sale_icon_url: "",
  flow_sale_card_bg: "",
};

export const CALC_HERO_QUERY_KEY = ["calc-hero-settings"] as const;

export type CalcHeroSettings = Record<CalcHeroKey, string>;

export function useCalcHeroSettings() {
  return useQuery({
    queryKey: CALC_HERO_QUERY_KEY,
    queryFn: async (): Promise<CalcHeroSettings> => {
      const { data, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", CALC_HERO_KEYS as unknown as string[]);
      if (error) throw error;
      const map: CalcHeroSettings = { ...CALC_HERO_DEFAULTS };
      (data || []).forEach((row: any) => {
        if ((CALC_HERO_KEYS as readonly string[]).includes(row.key)) {
          map[row.key as CalcHeroKey] = row.value ?? CALC_HERO_DEFAULTS[row.key as CalcHeroKey];
        }
      });
      return map;
    },
  });
}
