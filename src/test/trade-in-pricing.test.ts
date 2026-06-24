import { describe, it, expect } from "vitest";
import { computePricing, emptyAnswers } from "@/lib/trade-in-pricing";
import type { ConditionRow, DamageOption, DamageCategory } from "@/lib/trade-in-pricing";

const noCategories: DamageCategory[] = [];

function makeCondition(overrides: Partial<ConditionRow> = {}): ConditionRow {
  return {
    id: "cond-1",
    condition_name: "Bom",
    discount_percentage: 10,
    is_rejected: false,
    closes_checklist: false,
    ...overrides,
  };
}

function makeDamageOption(overrides: Partial<DamageOption> = {}): DamageOption {
  return {
    id: "opt-1",
    damage_category_id: "cat-1",
    option_name: "Sim",
    deduction_value: 50,
    is_rejected: false,
    closes_checklist: false,
    ...overrides,
  };
}

describe("computePricing — closes_checklist", () => {
  it("condition with closes_checklist=true → isRejected=false, discount applied", () => {
    const cond = makeCondition({ closes_checklist: true, discount_percentage: 15 });
    const answers = { ...emptyAnswers(), conditionId: cond.id };
    const result = computePricing(1000, answers, [cond], [], noCategories);
    expect(result.isRejected).toBe(false);
    expect(result.percentDiscount).toBe(15);
    expect(result.finalValue).toBe(850);
  });

  it("damage option with closes_checklist=true → isRejected=false, deduction applied", () => {
    const opt = makeDamageOption({ closes_checklist: true, deduction_value: 100 });
    const answers = {
      ...emptyAnswers(),
      damageOptionByCategory: { "cat-1": opt.id },
    };
    const result = computePricing(1000, answers, [], [opt], noCategories);
    expect(result.isRejected).toBe(false);
    expect(result.fixedDeductions).toBe(100);
    expect(result.finalValue).toBe(900);
  });

  it("unanswered questions after closes_checklist → zero contribution", () => {
    const cond = makeCondition({ closes_checklist: true, discount_percentage: 10 });
    // cat-2 and cat-3 not answered (wizard skipped them)
    const answers = {
      ...emptyAnswers(),
      conditionId: cond.id,
      damageOptionByCategory: { "cat-2": null, "cat-3": null },
    };
    const result = computePricing(1000, answers, [cond], [], noCategories);
    expect(result.isRejected).toBe(false);
    expect(result.fixedDeductions).toBe(0);
    expect(result.percentDiscount).toBe(10);
    expect(result.finalValue).toBe(900);
  });
});
