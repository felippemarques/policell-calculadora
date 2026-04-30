/**
 * Helpers para serializar/desserializar o "ajuste comercial" de uma proposta
 * dentro do campo `evaluations.internal_notes`, sem precisar de coluna nova.
 *
 * Estrutura gravada (texto livre + bloco JSON delimitado por marcadores HTML):
 *
 *   <observação livre opcional do operador>
 *
 *   <!--PROPOSAL_OVERRIDE_V1
 *   { ...payload JSON... }
 *   PROPOSAL_OVERRIDE_V1-->
 */

export type BonusType = "percent" | "money";

export interface ProposalOriginalSnapshot {
  basePrice: number;
  bonusPercent: number;
  bonusValue: number; // em R$, calculado = base * percent/100
  finalValue: number;
}

export interface ProposalOverridePayload {
  basePrice: number;
  bonusType: BonusType;
  /** Valor numérico bruto digitado no input (ou em % ou em R$, conforme bonusType). */
  bonusValue: number;
  /** Bônus convertido para R$ (espelho calculado para facilitar consumo). */
  bonusValueMoney: number;
  finalValue: number;
}

export interface ProposalOverrideRecord {
  original: ProposalOriginalSnapshot;
  override: ProposalOverridePayload;
  /** finalValue ajustado − finalValue original. Pode ser negativo. */
  extraBonus: number;
  updatedAt: string; // ISO
  updatedBy?: string | null;
}

const OPEN = "<!--PROPOSAL_OVERRIDE_V1";
const CLOSE = "PROPOSAL_OVERRIDE_V1-->";

const BLOCK_RE = /<!--PROPOSAL_OVERRIDE_V1\s*([\s\S]*?)\s*PROPOSAL_OVERRIDE_V1-->/;

/** Extrai o texto livre (sem o bloco JSON) das anotações. */
export function stripOverrideBlock(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.replace(BLOCK_RE, "").trim();
}

/** Tenta parsear o bloco de override. Retorna null se não houver. */
export function parseProposalOverride(
  notes: string | null | undefined,
): ProposalOverrideRecord | null {
  if (!notes) return null;
  const m = notes.match(BLOCK_RE);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1]);
    if (!obj?.original || !obj?.override) return null;
    return obj as ProposalOverrideRecord;
  } catch {
    return null;
  }
}

/** Constrói o conteúdo final a gravar em `internal_notes`. */
export function serializeOverride(
  freeText: string,
  record: ProposalOverrideRecord,
): string {
  const json = JSON.stringify(record, null, 2);
  const free = (freeText || "").trim();
  return `${free}${free ? "\n\n" : ""}${OPEN}\n${json}\n${CLOSE}`;
}

/** Calcula o bônus em R$ a partir do tipo + valor. */
export function bonusToMoney(
  basePrice: number,
  bonusType: BonusType,
  bonusValue: number,
): number {
  if (!bonusValue || bonusValue <= 0) return 0;
  if (bonusType === "money") return Math.round(bonusValue * 100) / 100;
  // percent
  return Math.round(basePrice * (bonusValue / 100) * 100) / 100;
}

/**
 * Recalcula o final_value usando a mesma fórmula do fluxo público:
 *   base − (condition_discount em R$) − total_deductions + bônus_em_R$
 *
 * Atenção: `conditionDiscount` é numérico já em R$ (como gravado em
 * `evaluations.condition_discount`). Não confundir com a % do checklist.
 */
export function recalcFinalValue(opts: {
  basePrice: number;
  conditionDiscount: number;
  totalDeductions: number;
  bonusMoney: number;
}): number {
  const v =
    opts.basePrice - (opts.conditionDiscount || 0) - (opts.totalDeductions || 0) + (opts.bonusMoney || 0);
  return Math.round(Math.max(0, v) * 100) / 100;
}
