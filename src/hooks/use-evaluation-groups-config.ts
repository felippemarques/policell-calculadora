import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Stable internal ids for the 3 evaluation groups shown in the public calculator.
 * They DO NOT match the visible UI labels — UI labels are mapped separately.
 *
 *  - "conditions" → backed by `condition_discounts` where is_rejected=false
 *      Public label (after rename): "Categorias de Defeitos"
 *  - "defects"    → backed by `damage_categories` (+ `damage_deductions`)
 *      Public label (after rename): "Condições do Aparelho"
 *  - "rejection"  → backed by `condition_discounts` where is_rejected=true
 *      Public label: "Motivos de Rejeição"
 */
export type EvaluationGroupId = "conditions" | "defects" | "rejection";

const DEFAULT_ORDER: EvaluationGroupId[] = ["conditions", "defects", "rejection"];

const GROUP_KEYS = [
  "evaluation_groups_order",
  "eval_group_conditions_visible",
  "eval_group_defects_visible",
  "eval_group_rejection_visible",
] as const;

export interface EvaluationGroupsConfig {
  order: EvaluationGroupId[];
  visible: Record<EvaluationGroupId, boolean>;
}

const QK = ["evaluation-groups-config"];

export function useEvaluationGroupsConfig() {
  return useQuery<EvaluationGroupsConfig>({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", GROUP_KEYS as unknown as string[]);
      if (error) throw error;

      const map = new Map<string, string>((data ?? []).map((r: any) => [r.key, r.value]));

      // Order
      let order: EvaluationGroupId[] = DEFAULT_ORDER;
      const rawOrder = map.get("evaluation_groups_order");
      if (rawOrder) {
        try {
          const parsed = JSON.parse(rawOrder);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((x: unknown): x is EvaluationGroupId =>
              typeof x === "string" && DEFAULT_ORDER.includes(x as EvaluationGroupId),
            );
            // Append any missing groups so we always render all 3
            for (const g of DEFAULT_ORDER) if (!valid.includes(g)) valid.push(g);
            order = valid;
          }
        } catch {
          /* keep default */
        }
      }

      // Visibility
      const readBool = (k: string, fallback: boolean) => {
        const v = map.get(k);
        if (v == null) return fallback;
        return v === "true" || v === "1";
      };
      const visible: Record<EvaluationGroupId, boolean> = {
        conditions: readBool("eval_group_conditions_visible", true),
        defects: readBool("eval_group_defects_visible", true),
        rejection: readBool("eval_group_rejection_visible", true),
      };

      return { order, visible };
    },
    staleTime: 30_000,
  });
}

export function useUpdateEvaluationGroupsConfig() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (next: Partial<EvaluationGroupsConfig>) => {
      const updates: { key: string; value: string }[] = [];

      if (next.order) {
        updates.push({
          key: "evaluation_groups_order",
          value: JSON.stringify(next.order),
        });
      }
      if (next.visible) {
        const map = next.visible;
        if ("conditions" in map)
          updates.push({ key: "eval_group_conditions_visible", value: String(map.conditions) });
        if ("defects" in map)
          updates.push({ key: "eval_group_defects_visible", value: String(map.defects) });
        if ("rejection" in map)
          updates.push({ key: "eval_group_rejection_visible", value: String(map.rejection) });
      }

      // Upsert one by one (table has no unique constraint on key, so we delete+insert)
      for (const u of updates) {
        const { error: delErr } = await supabase
          .from("lp_settings")
          .delete()
          .eq("key", u.key);
        if (delErr) throw delErr;
        const { error: insErr } = await supabase
          .from("lp_settings")
          .insert({ key: u.key, value: u.value });
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
    },
  });
}
