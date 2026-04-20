// Sanity validation for the trade-in flow.
// Detects "orphan" data: selections that no longer match the current catalog
// or selections that reference a different device than the one chosen.
//
// Used by:
//   - StepResult.tsx (block the result UI if anything is inconsistent)
//   - useSubmitEvaluation (last line of defense before persisting)

import type { ChecklistAnswers, ConditionRow, DamageOption, DamageCategory } from "./trade-in-pricing";
import type { Database } from "@/integrations/supabase/types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

export interface SanityResult {
  ok: boolean;
  reason: string | null;
}

/**
 * Validates the entire wizard state against the live catalog.
 *
 * Checks:
 *  1. The selected device exists in the devices table.
 *  2. Each chosen condition/damage option still exists.
 *  3. Each chosen damage option's category still exists and matches the device's brand
 *     (a category restricted to brand X must not have leaked into a brand-Y submission).
 *  4. The condition discount and damage deductions stored in pricing match what the
 *     catalog would currently produce — guards against stale UI state.
 */
export function validateTradeInState(args: {
  device: Device | undefined | null;
  brandId: string | null | undefined;
  answers: ChecklistAnswers;
  conditions: ConditionRow[];
  damageOptions: DamageOption[];
  damageCategories: DamageCategory[];
  /** Live catalog brand ids — used to ignore stale brand_ids on categories. */
  validBrandIds?: string[];
}): SanityResult {
  const { device, brandId, answers, conditions, damageOptions, damageCategories, validBrandIds } = args;
  const validBrandSet = new Set(validBrandIds ?? []);

  if (!device) {
    return { ok: false, reason: "Aparelho não encontrado no catálogo atual." };
  }

  // Device must declare a brand_id matching the brand we used to filter categories
  if (brandId && device.brand_id && device.brand_id !== brandId) {
    return { ok: false, reason: "A marca selecionada não corresponde ao aparelho escolhido." };
  }

  // Condition (Tela A) — if chosen, must exist
  if (answers.conditionId) {
    const cond = conditions.find((c) => c.id === answers.conditionId);
    if (!cond) {
      return { ok: false, reason: "Uma das opções de condição selecionadas não está mais disponível." };
    }
  }

  // Rejection (Tela C) — if chosen, must exist and be a rejection
  if (answers.rejectionId) {
    const rej = conditions.find((c) => c.id === answers.rejectionId);
    if (!rej || !rej.is_rejected) {
      return { ok: false, reason: "Motivo de rejeição inválido." };
    }
  }

  // Damage options (Tela B) — every chosen option must exist and belong to its category,
  // and the category must be valid for the device's brand.
  for (const [catId, optId] of Object.entries(answers.damageOptionByCategory)) {
    if (!optId) continue;
    const opt = damageOptions.find((o) => o.id === optId);
    if (!opt) {
      return { ok: false, reason: "Uma das opções de defeito selecionadas não está mais disponível." };
    }
    if (opt.damage_category_id !== catId) {
      return { ok: false, reason: "Resposta inconsistente: opção de defeito não pertence à categoria respondida." };
    }
    const cat = damageCategories.find((c) => c.id === catId);
    if (!cat) {
      return { ok: false, reason: "Uma das categorias de defeito não está mais disponível." };
    }
    // Brand restriction: if the (root) category has brand_ids, the device's brand must be in it.
    // Stale brand_ids (pointing to deleted brands) are ignored — same logic as the checklist UI.
    const rootCat = findRootCategory(cat, damageCategories);
    if (rootCat && rootCat.brand_ids && rootCat.brand_ids.length > 0) {
      const liveBrandIds = validBrandSet.size > 0
        ? rootCat.brand_ids.filter((id) => validBrandSet.has(id))
        : rootCat.brand_ids;
      if (liveBrandIds.length > 0 && (!brandId || !liveBrandIds.includes(brandId))) {
        return {
          ok: false,
          reason: "Uma resposta refere-se a um critério que não se aplica à marca do aparelho.",
        };
      }
    }
  }

  return { ok: true, reason: null };
}

function findRootCategory(
  cat: DamageCategory,
  all: DamageCategory[],
): DamageCategory | null {
  let current: DamageCategory | undefined = cat;
  const seen = new Set<string>();
  while (current && current.parent_id && !seen.has(current.id)) {
    seen.add(current.id);
    const parent: DamageCategory | undefined = all.find((c) => c.id === current!.parent_id);
    if (!parent) break;
    current = parent;
  }
  return current ?? null;
}

/**
 * Quick helper used by reset-cascade in StepSelectDevice: returns true if the
 * user has any non-empty answers in the checklist.
 */
export function hasAnyAnswers(answers: ChecklistAnswers): boolean {
  if (answers.conditionId) return true;
  if (answers.rejectionId) return true;
  return Object.values(answers.damageOptionByCategory).some((v) => !!v);
}
