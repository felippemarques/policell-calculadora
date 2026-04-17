import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("model")
        .order("base_price");
      if (error) throw error;
      return data;
    },
  });
}

export function useDamageCategories() {
  return useQuery({
    queryKey: ["damage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_categories")
        .select("*, damage_deductions(*)")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useConditionDiscounts() {
  return useQuery({
    queryKey: ["condition-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condition_discounts")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });
}

export interface ColorRow {
  id: string;
  name: string;
  hex_code: string | null;
  brand_ids: string[];
  display_order: number;
}

/**
 * Returns colors filtered by the device's brand.
 * - If `brandId` is null/undefined → query is disabled.
 * - Otherwise returns colors where `brand_ids` is empty (global) OR contains `brandId`.
 */
export function useColorsByBrand(brandId: string | null | undefined) {
  return useQuery({
    queryKey: ["colors-by-brand", brandId ?? "none"],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colors")
        .select("id, name, hex_code, brand_ids, display_order")
        .order("display_order")
        .order("name");
      if (error) throw error;
      const all = (data || []) as ColorRow[];
      return all.filter(
        (c) =>
          !c.brand_ids ||
          c.brand_ids.length === 0 ||
          (brandId ? c.brand_ids.includes(brandId) : false),
      );
    },
  });
}
