import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CALC_HERO_KEYS = [
  "calc_hero_bg_image",
  "calc_hero_bg_image_2",
  "calc_hero_bg_image_3",
  "calc_hero_bg_interval",
  "calc_hero_bg_fit",
  "calc_hero_bg_color",
  "calc_hero_text_color",
  "calc_hero_logo_url",
  "calc_hero_align",
  "calc_hero_title_align",
  "calc_hero_subtitle_align",
  "calc_hero_title",
  "calc_hero_subtitle",
  "calc_hero_tagline",
  "calc_hero_tagline_align",
  "calc_hero_title_font",
  "calc_hero_title_size",
  "calc_hero_subtitle_font",
  "calc_hero_subtitle_size",
  "calc_hero_tagline_font",
  "calc_hero_tagline_size",
  "flow_trade_icon_url",
  "flow_trade_card_bg",
  "flow_trade_cta_bg",
  "flow_trade_cta_text_color",
  "flow_sale_icon_url",
  "flow_sale_card_bg",
  "flow_sale_cta_bg",
  "flow_sale_cta_text_color",
  "flow_sale_card_opacity",
] as const;

export type CalcHeroKey = (typeof CALC_HERO_KEYS)[number];

export const CALC_HERO_DEFAULTS: Record<CalcHeroKey, string> = {
  calc_hero_bg_image: "",
  calc_hero_bg_image_2: "",
  calc_hero_bg_image_3: "",
  calc_hero_bg_interval: "5000",
  calc_hero_bg_fit: "cover",
  calc_hero_bg_color: "",
  calc_hero_text_color: "",
  calc_hero_logo_url: "",
  calc_hero_align: "center",
  calc_hero_title_align: "",
  calc_hero_subtitle_align: "",
  calc_hero_title: "Policell",
  calc_hero_subtitle: "Garantia de entrega e qualidade.",
  calc_hero_tagline: "",
  calc_hero_tagline_align: "",
  calc_hero_title_font: "sans",
  calc_hero_title_size: "h1",
  calc_hero_subtitle_font: "sans",
  calc_hero_subtitle_size: "body",
  calc_hero_tagline_font: "sans",
  calc_hero_tagline_size: "small",
  flow_trade_icon_url: "",
  flow_trade_card_bg: "",
  flow_trade_cta_bg: "",
  flow_trade_cta_text_color: "",
  flow_sale_icon_url: "",
  flow_sale_card_bg: "",
  flow_sale_cta_bg: "",
  flow_sale_cta_text_color: "",
  flow_sale_card_opacity: "70",
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
        .in("key", [...CALC_HERO_KEYS, "logo_url"] as unknown as string[]);
      if (error) throw error;
      const map: CalcHeroSettings = { ...CALC_HERO_DEFAULTS };
      (data || []).forEach((row: any) => {
        if ((CALC_HERO_KEYS as readonly string[]).includes(row.key)) {
          map[row.key as CalcHeroKey] = row.value ?? CALC_HERO_DEFAULTS[row.key as CalcHeroKey];
        } else if (row.key === "logo_url" && !map.calc_hero_logo_url) {
          map.calc_hero_logo_url = row.value ?? "";
        }
      });
      return map;
    },
  });
}
