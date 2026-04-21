// Centralized pricing logic for the trade-in flow.
// Shared between TradeInWizard (submit) and StepEvaluationChecklist (live preview).

export type DiscountMode = "percent" | "fixed";

export interface ConditionRow {
  id: string;
  condition_name: string;
  discount_percentage: number;
  discount_fixed?: number;
  discount_mode?: DiscountMode;
  is_rejected: boolean;
  help_text?: string | null;
  is_required?: boolean;
  model_ids?: string[] | null;
  youtube_url?: string | null;
}

export interface DamageOption {
  id: string;
  damage_category_id: string;
  option_name: string;
  deduction_value: number;
  deduction_percent?: number;
  deduction_mode?: DiscountMode;
  is_rejected: boolean;
}

export interface DamageCategory {
  id: string;
  name: string;
  help_text?: string | null;
  help_image_url?: string | null;
  parent_id?: string | null;
  is_required?: boolean;
  /**
   * Brands this category applies to. Empty array (or undefined) = global (all brands).
   */
  brand_ids?: string[] | null;
  /**
   * Models this category applies to. Empty array (or undefined) = global (all models).
   */
  model_ids?: string[] | null;
  youtube_url?: string | null;
  /**
   * Conditional reveal: when set, this category is only shown after the user
   * selects the damage option with this id (in any other category). It's a
   * subcategory triggered by a specific *answer*, not by another category.
   */
  parent_option_id?: string | null;
}

export interface ChecklistAnswers {
  // Condition (Tela A) — selected condition_discounts.id (non-rejected only)
  conditionId: string | null;
  // Damage categories (Tela B) — categoryId -> selected damage_deductions.id
  damageOptionByCategory: Record<string, string | null>;
  // Hard-stop rejection (Tela C) — selected condition_discounts.id (is_rejected=true)
  rejectionId: string | null;
}

export function emptyAnswers(): ChecklistAnswers {
  return { conditionId: null, damageOptionByCategory: {}, rejectionId: null };
}

export interface PricingBreakdown {
  basePrice: number;
  percentDiscount: number; // sum of % discounts
  fixedDeductions: number; // sum of R$ deductions
  finalValue: number;
  isRejected: boolean;
  rejectionReason: string | null;
}

export function computePricing(
  basePrice: number,
  answers: ChecklistAnswers,
  conditions: ConditionRow[],
  damageOptions: DamageOption[],
  damageCategories: DamageCategory[],
): PricingBreakdown {
  let percentDiscount = 0;
  let fixedDeductions = 0;
  let isRejected = false;
  let rejectionReason: string | null = null;

  // Condition (Tela A) — supports percent OR fixed
  if (answers.conditionId) {
    const cond = conditions.find((c) => c.id === answers.conditionId);
    if (cond && !cond.is_rejected) {
      const mode: DiscountMode = (cond.discount_mode as DiscountMode) || "percent";
      if (mode === "fixed") {
        fixedDeductions += Number(cond.discount_fixed) || 0;
      } else {
        percentDiscount += Number(cond.discount_percentage) || 0;
      }
    }
  }

  // Damage options (Tela B) — supports fixed OR percent; any is_rejected blocks
  for (const [catId, optId] of Object.entries(answers.damageOptionByCategory)) {
    if (!optId) continue;
    const opt = damageOptions.find((o) => o.id === optId);
    if (!opt) continue;
    if (opt.is_rejected) {
      isRejected = true;
      const cat = damageCategories.find((c) => c.id === catId);
      rejectionReason = `${cat?.name ?? "Defeito"}: ${opt.option_name}`;
    } else {
      const mode: DiscountMode = (opt.deduction_mode as DiscountMode) || "fixed";
      if (mode === "percent") {
        percentDiscount += Number(opt.deduction_percent) || 0;
      } else {
        fixedDeductions += Number(opt.deduction_value) || 0;
      }
    }
  }

  // Rejection reason (Tela C) — always blocks
  if (answers.rejectionId) {
    const rej = conditions.find((c) => c.id === answers.rejectionId);
    if (rej && rej.is_rejected) {
      isRejected = true;
      rejectionReason = rej.condition_name;
    }
  }

  // Linear math (NO compounding): every % is computed on the original basePrice,
  // never on the remaining balance. Order of selections is irrelevant.
  const percentAmount = Math.round(basePrice * (percentDiscount / 100) * 100) / 100;
  const totalDeductions = Math.min(basePrice, fixedDeductions + percentAmount);
  const finalValue = isRejected
    ? 0
    : Math.max(0, Math.round((basePrice - totalDeductions) * 100) / 100);

  return { basePrice, percentDiscount, fixedDeductions, finalValue, isRejected, rejectionReason };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
