import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyAppleCasingForBrand } from "@/lib/apple-naming";

export interface DeviceWithImage {
  id: string;
  brand: string;
  brand_id: string | null;
  model: string;
  storage: string;
  colors: string | null;
  base_price: number;
  trade_price: number;
  sale_price: number;
  is_visible: boolean;
  created_at: string;
  image_url: string | null;
}

export interface BrandLogo {
  name: string;
  logo_url: string | null;
}

export function useBrandLogos() {
  return useQuery({
    queryKey: ["brand-logos"],
    queryFn: async (): Promise<BrandLogo[]> => {
      const { data, error } = await supabase
        .from("brands")
        .select("name, logo_url, display_order")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []).map((b: any) => ({
        name: b.name,
        logo_url: b.logo_url ?? null,
      }));
    },
  });
}

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async (): Promise<DeviceWithImage[]> => {
      // Fetch storages first to get display_order map (smallest → largest)
      const [storagesRes, devicesRes, modelsRes] = await Promise.all([
        supabase.from("storages").select("capacity, display_order"),
        supabase.from("devices").select("*").eq("is_visible", true),
        supabase.from("device_models").select("name, brand_id, image_url"),
      ]);
      if (devicesRes.error) throw devicesRes.error;

      const orderMap = new Map<string, number>();
      (storagesRes.data || []).forEach((s: any) =>
        orderMap.set(String(s.capacity).trim().toLowerCase(), s.display_order ?? 9999),
      );

      // Build (brand_id, lower(name)) → image_url map
      const imageMap = new Map<string, string | null>();
      (modelsRes.data || []).forEach((m: any) => {
        const key = `${m.brand_id}::${String(m.name).trim().toLowerCase()}`;
        imageMap.set(key, m.image_url ?? null);
      });

      const merged: DeviceWithImage[] = (devicesRes.data || []).map((d: any) => ({
        ...d,
        model: applyAppleCasingForBrand(String(d.model ?? ""), d.brand),
        image_url:
          imageMap.get(`${d.brand_id}::${String(d.model).trim().toLowerCase()}`) ?? null,
      }));

      // Sort by model name → storage display_order (smallest → largest) → base_price
      return merged.sort((a, b) => {
        if (a.model !== b.model) return String(a.model).localeCompare(String(b.model));
        const ao = orderMap.get(String(a.storage).trim().toLowerCase()) ?? 9999;
        const bo = orderMap.get(String(b.storage).trim().toLowerCase()) ?? 9999;
        if (ao !== bo) return ao - bo;
        return Number(a.base_price) - Number(b.base_price);
      });
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
  image_url: string | null;
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
        .select("id, name, hex_code, image_url, brand_ids, display_order")
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

/**
 * Returns the colors registered specifically for a given device variant
 * (model + storage). Since `devices.id` mirrors `model_storages.id`, we can
 * query `variant_colors.model_storage_id = deviceId` directly.
 *
 * If no variant colors are registered for the device, falls back to the
 * brand-level colors so legacy catalogs keep working.
 */
export function useColorsByDevice(
  deviceId: string | null | undefined,
  brandId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["colors-by-device", deviceId ?? "none", brandId ?? "none"],
    enabled: !!deviceId,
    queryFn: async (): Promise<ColorRow[]> => {
      // 1. Try variant_colors for this exact device variant (only visible ones)
      const { data: variants, error: vErr } = await supabase
        .from("variant_colors")
        .select(
          "display_order, is_visible, colors:color_id (id, name, hex_code, image_url, brand_ids, display_order)",
        )
        .eq("model_storage_id", deviceId!)
        .eq("is_visible", true)
        .order("display_order");
      if (vErr) throw vErr;

      const variantColors: ColorRow[] = (variants || [])
        .map((v: any) => v.colors)
        .filter(Boolean);

      if (variantColors.length > 0) {
        return variantColors;
      }

      // 2. Fallback: colors filtered by brand (legacy behavior)
      if (!brandId) return [];
      const { data, error } = await supabase
        .from("colors")
        .select("id, name, hex_code, image_url, brand_ids, display_order")
        .order("display_order")
        .order("name");
      if (error) throw error;
      const all = (data || []) as ColorRow[];
      return all.filter(
        (c) =>
          !c.brand_ids ||
          c.brand_ids.length === 0 ||
          c.brand_ids.includes(brandId),
      );
    },
  });
}

/**
 * Resolve the public-facing base price for a device based on the chosen flow.
 * Falls back to `base_price` (legacy) when the flow-specific price is zero.
 */
export function resolveBasePrice(
  device: { base_price?: number | null; trade_price?: number | null; sale_price?: number | null } | null | undefined,
  flowType: "trade" | "sale" | null | undefined,
): number {
  if (!device) return 0;
  const base = Number(device.base_price ?? 0);
  if (flowType === "trade") {
    const tp = Number(device.trade_price ?? 0);
    return tp > 0 ? tp : base;
  }
  if (flowType === "sale") {
    const sp = Number(device.sale_price ?? 0);
    return sp > 0 ? sp : base;
  }
  return base;
}
