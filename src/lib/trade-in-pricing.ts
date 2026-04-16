// Centralized pricing logic for the trade-in flow.
// Shared between TradeInWizard (submit) and StepEvaluationChecklist (live preview).

export interface ConditionRow {
  id: string;
  condition_name: string;
  discount_percentage: number;
  is_rejected: boolean;
}

export interface DamageOption {
  id: string;
  damage_category_id: string;
  option_name: string;
  deduction_value: number;
  is_rejected: boolean;
}

export interface DamageCategory {
  id: string;
  name: string;
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

  // Condition (Tela A)
  if (answers.conditionId) {
    const cond = conditions.find((c) => c.id === answers.conditionId);
    if (cond && !cond.is_rejected) {
      percentDiscount += Number(cond.discount_percentage) || 0;
    }
  }

  // Damage options (Tela B) — fixed deductions, but any is_rejected blocks
  for (const [catId, optId] of Object.entries(answers.damageOptionByCategory)) {
    if (!optId) continue;
    const opt = damageOptions.find((o) => o.id === optId);
    if (!opt) continue;
    if (opt.is_rejected) {
      isRejected = true;
      const cat = damageCategories.find((c) => c.id === catId);
      rejectionReason = `${cat?.name ?? "Defeito"}: ${opt.option_name}`;
    } else {
      fixedDeductions += Number(opt.deduction_value) || 0;
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

  const afterFixed = Math.max(0, basePrice - fixedDeductions);
  const finalValue = isRejected
    ? 0
    : Math.max(0, Math.round(afterFixed * (1 - percentDiscount / 100) * 100) / 100);

  return { basePrice, percentDiscount, fixedDeductions, finalValue, isRejected, rejectionReason };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
