-- Add closes_checklist to condition_discounts and damage_deductions
-- with mutual exclusivity CHECK constraints

ALTER TABLE condition_discounts
  ADD COLUMN closes_checklist BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT chk_condition_exclusive_action
    CHECK (NOT (is_rejected = true AND closes_checklist = true));

ALTER TABLE damage_deductions
  ADD COLUMN closes_checklist BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT chk_damage_exclusive_action
    CHECK (NOT (is_rejected = true AND closes_checklist = true));
