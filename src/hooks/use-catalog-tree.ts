import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogColor {
  variant_color_id: string;
  color_id: string;
  name: string;
  hex_code: string | null;
  display_order: number;
}

export interface CatalogStorage {
  model_storage_id: string;
  storage_id: string;
  capacity: string;
  base_price: number;
  trade_price: number;
  sale_price: number;
  display_order: number;
  colors: CatalogColor[];
}

export interface CatalogModel {
  model_id: string;
  model_name: string;
  display_order: number;
  storages: CatalogStorage[];
}

export interface CatalogBrand {
  brand_id: string;
  brand_name: string;
  display_order: number;
  models: CatalogModel[];
}

export const CATALOG_TREE_KEY = ["catalog-tree"] as const;

export function useCatalogTree() {
  return useQuery({
    queryKey: CATALOG_TREE_KEY,
    queryFn: async (): Promise<CatalogBrand[]> => {
      const [brandsRes, modelsRes, storagesRes, colorsRes, msRes, vcRes] = await Promise.all([
        supabase.from("brands").select("id, name, display_order").order("display_order").order("name"),
        supabase.from("device_models").select("id, name, brand_id, display_order").order("display_order").order("name"),
        supabase.from("storages").select("id, capacity, display_order").order("display_order").order("capacity"),
        supabase.from("colors").select("id, name, hex_code, brand_ids, display_order").order("display_order").order("name"),
        supabase.from("model_storages").select("id, model_id, storage_id, base_price, trade_price, sale_price, display_order"),
        supabase.from("variant_colors").select("id, model_storage_id, color_id, display_order"),
      ]);

      for (const r of [brandsRes, modelsRes, storagesRes, colorsRes, msRes, vcRes]) {
        if (r.error) throw r.error;
      }

      const storagesById = new Map((storagesRes.data || []).map((s) => [s.id, s]));
      const colorsById = new Map((colorsRes.data || []).map((c) => [c.id, c]));

      const colorsByMs = new Map<string, CatalogColor[]>();
      for (const vc of vcRes.data || []) {
        const c = colorsById.get(vc.color_id);
        if (!c) continue;
        const arr = colorsByMs.get(vc.model_storage_id) || [];
        arr.push({
          variant_color_id: vc.id,
          color_id: vc.color_id,
          name: c.name,
          hex_code: c.hex_code,
          display_order: vc.display_order,
        });
        colorsByMs.set(vc.model_storage_id, arr);
      }
      for (const arr of colorsByMs.values()) {
        arr.sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
      }

      const storagesByModel = new Map<string, CatalogStorage[]>();
      for (const ms of msRes.data || []) {
        const s = storagesById.get(ms.storage_id);
        if (!s) continue;
        const arr = storagesByModel.get(ms.model_id) || [];
        arr.push({
          model_storage_id: ms.id,
          storage_id: ms.storage_id,
          capacity: s.capacity,
          base_price: Number(ms.base_price),
          trade_price: Number((ms as any).trade_price ?? ms.base_price),
          sale_price: Number((ms as any).sale_price ?? ms.base_price),
          display_order: ms.display_order,
          colors: colorsByMs.get(ms.id) || [],
        });
        storagesByModel.set(ms.model_id, arr);
      }
      for (const arr of storagesByModel.values()) {
        arr.sort((a, b) => a.display_order - b.display_order || a.capacity.localeCompare(b.capacity));
      }

      const modelsByBrand = new Map<string, CatalogModel[]>();
      for (const m of modelsRes.data || []) {
        const arr = modelsByBrand.get(m.brand_id) || [];
        arr.push({
          model_id: m.id,
          model_name: m.name,
          display_order: m.display_order,
          storages: storagesByModel.get(m.id) || [],
        });
        modelsByBrand.set(m.brand_id, arr);
      }

      return (brandsRes.data || []).map((b) => ({
        brand_id: b.id,
        brand_name: b.name,
        display_order: b.display_order,
        models: modelsByBrand.get(b.id) || [],
      }));
    },
  });
}

/** Auxiliary: list of all storages (for + Capacidade dropdown). */
export function useAllStorages() {
  return useQuery({
    queryKey: ["all-storages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storages")
        .select("id, capacity, display_order")
        .order("display_order")
        .order("capacity");
      if (error) throw error;
      return data;
    },
  });
}

/** Auxiliary: list of all colors with brand_ids filter info (for + Cor dropdown). */
export function useAllColors() {
  return useQuery({
    queryKey: ["all-colors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colors")
        .select("id, name, hex_code, brand_ids, display_order")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
