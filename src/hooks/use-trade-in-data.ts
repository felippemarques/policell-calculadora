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
