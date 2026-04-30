/**
 * Helpers para o painel admin reconstruir um ContractData a partir de uma
 * `evaluations` row (snapshot original OU snapshot ajustado pelo comercial),
 * gerando os PDFs de download.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ContractData, EvaluationLineItem } from "@/lib/contract";
import { formatBRL } from "@/lib/trade-in-pricing";
import type { ProposalOverrideRecord } from "@/lib/proposal-override";

/** Reconstrói os itens da avaliação a partir do array `damages` da evaluation,
 *  que armazena strings no formato "condition:<id>" e "damage:<catId>:<optId>". */
export async function rebuildEvaluationItems(
  damages: unknown,
): Promise<EvaluationLineItem[]> {
  if (!Array.isArray(damages) || damages.length === 0) return [];

  const conditionIds: string[] = [];
  const damagePairs: Array<{ catId: string; optId: string }> = [];
  for (const raw of damages) {
    if (typeof raw !== "string") continue;
    if (raw.startsWith("condition:")) {
      conditionIds.push(raw.slice("condition:".length));
    } else if (raw.startsWith("damage:")) {
      const [, catId, optId] = raw.split(":");
      if (catId && optId) damagePairs.push({ catId, optId });
    }
  }

  const items: EvaluationLineItem[] = [];

  if (conditionIds.length > 0) {
    const { data: conds } = await supabase
      .from("condition_discounts")
      .select("id, condition_name, discount_mode, discount_percentage, discount_fixed")
      .in("id", conditionIds);
    for (const id of conditionIds) {
      const c = (conds ?? []).find((x: any) => x.id === id);
      if (!c) continue;
      let impact = "";
      const mode = (c as any).discount_mode || "percent";
      if (mode === "fixed") {
        const v = Number((c as any).discount_fixed) || 0;
        if (v > 0) impact = `− ${formatBRL(v)}`;
      } else {
        const p = Number((c as any).discount_percentage) || 0;
        if (p > 0) impact = `− ${p}% sobre o valor base`;
      }
      items.push({
        group: "Estado de conservação",
        answer: (c as any).condition_name,
        impact,
      });
    }
  }

  if (damagePairs.length > 0) {
    const catIds = Array.from(new Set(damagePairs.map((p) => p.catId)));
    const optIds = Array.from(new Set(damagePairs.map((p) => p.optId)));
    const [{ data: cats }, { data: opts }] = await Promise.all([
      supabase.from("damage_categories").select("id, name").in("id", catIds),
      supabase
        .from("damage_deductions")
        .select("id, option_name, deduction_mode, deduction_value, deduction_percent, is_rejected")
        .in("id", optIds),
    ]);
    for (const { catId, optId } of damagePairs) {
      const cat = (cats ?? []).find((x: any) => x.id === catId);
      const opt = (opts ?? []).find((x: any) => x.id === optId);
      if (!cat || !opt) continue;
      let impact = "";
      if ((opt as any).is_rejected) {
        impact = "Bloqueia avaliação";
      } else {
        const mode = (opt as any).deduction_mode || "fixed";
        if (mode === "percent") {
          const p = Number((opt as any).deduction_percent) || 0;
          if (p > 0) impact = `− ${p}% sobre o valor base`;
        } else {
          const v = Number((opt as any).deduction_value) || 0;
          if (v > 0) impact = `− ${formatBRL(v)}`;
        }
      }
      items.push({
        group: (cat as any).name,
        answer: (opt as any).option_name,
        impact,
      });
    }
  }

  return items;
}

/** Tenta encontrar o lead correspondente à evaluation (para resgatar
 *  endereço, IMEI etc). Match por IMEI primeiro, depois por e-mail. */
export async function findLeadForEvaluation(evaluation: {
  imei?: string | null;
  customer_email?: string | null;
}): Promise<any | null> {
  if (evaluation.imei) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("imei", evaluation.imei.replace(/\D/g, ""))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  if (evaluation.customer_email) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("customer_email", evaluation.customer_email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

function buildAddressLine(lead: any | null): string {
  if (!lead) return "—";
  const line1 = [lead.address_street, lead.address_number].filter(Boolean).join(", ");
  const line2 = [lead.address_complement, lead.address_neighborhood].filter(Boolean).join(" — ");
  const line3 = [lead.address_city, lead.address_state].filter(Boolean).join("/");
  const cep = lead.address_zip ? `CEP ${String(lead.address_zip).replace(/(\d{5})(\d{3})/, "$1-$2")}` : "";
  const out = [line1, line2, line3, cep].filter(Boolean).join(" · ");
  return out || "—";
}

/** Bloco "REVISÃO COMERCIAL" anexado ao final do PDF ajustado. */
export function buildOverrideAddendum(record: ProposalOverrideRecord): string {
  const lines: string[] = [];
  lines.push("REVISÃO COMERCIAL DA PROPOSTA");
  lines.push("");
  lines.push(`Valor original da proposta: R$ ${formatBRL(record.original.finalValue).replace("R$", "").trim()}`);
  const sign = record.extraBonus >= 0 ? "+" : "−";
  const absExtra = Math.abs(record.extraBonus);
  lines.push(
    `Bônus extra concedido pelo comercial: ${sign} R$ ${formatBRL(absExtra).replace("R$", "").trim()}`,
  );
  lines.push(
    `NOVO VALOR FINAL: R$ ${formatBRL(record.override.finalValue).replace("R$", "").trim()}`,
  );
  lines.push("");
  if (record.override.basePrice !== record.original.basePrice) {
    lines.push(
      `Preço base ajustado: de R$ ${formatBRL(record.original.basePrice).replace("R$", "").trim()} para R$ ${formatBRL(record.override.basePrice).replace("R$", "").trim()}.`,
    );
  }
  if (record.override.bonusType === "money") {
    lines.push(
      `Bônus aplicado: R$ ${formatBRL(record.override.bonusValueMoney).replace("R$", "").trim()} (valor fixo definido pelo comercial).`,
    );
  } else {
    lines.push(
      `Bônus aplicado: ${record.override.bonusValue}% (= R$ ${formatBRL(record.override.bonusValueMoney).replace("R$", "").trim()}).`,
    );
  }
  lines.push("");
  const date = record.updatedAt ? new Date(record.updatedAt).toLocaleString("pt-BR") : "—";
  lines.push(
    `Ajuste registrado em ${date}${record.updatedBy ? ` por ${record.updatedBy}` : ""}.`,
  );
  lines.push(
    "Este novo valor substitui o valor da proposta original para fins de geração do cupom de desconto.",
  );
  return lines.join("\n");
}

interface BuildArgs {
  evaluation: any; // row de public.evaluations
  storeName: string;
  /** Quando true, monta usando os valores de `override` (do JSON em internal_notes). */
  useOverride: boolean;
  override: ProposalOverrideRecord | null;
}

/** Monta o ContractData completo (com itens, endereço, bônus em R$). */
export async function buildAdminContractData(args: BuildArgs): Promise<ContractData> {
  const { evaluation, storeName, useOverride, override } = args;

  const [items, lead, deviceRow] = await Promise.all([
    rebuildEvaluationItems(evaluation.damages),
    findLeadForEvaluation(evaluation),
    evaluation.device_id
      ? supabase
          .from("devices")
          .select("brand, model, storage")
          .eq("id", evaluation.device_id)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const deviceLabel = deviceRow
    ? [deviceRow.brand, deviceRow.model, deviceRow.storage].filter(Boolean).join(" ")
    : "—";

  // Determina os números a usar (original vs ajustado).
  let basePrice: number;
  let finalValue: number;
  let bonusValueMoney: number;
  let bonusPercent: number;

  if (useOverride && override) {
    basePrice = override.override.basePrice;
    finalValue = override.override.finalValue;
    bonusValueMoney = override.override.bonusValueMoney;
    bonusPercent =
      override.override.bonusType === "percent" ? override.override.bonusValue : 0;
  } else if (override) {
    // PDF "original" — usa o snapshot salvo
    basePrice = override.original.basePrice;
    finalValue = override.original.finalValue;
    bonusValueMoney = override.original.bonusValue;
    bonusPercent = override.original.bonusPercent;
  } else {
    // Sem override: snapshot vivo da evaluation
    basePrice = Number(evaluation.base_price) || 0;
    finalValue = Number(evaluation.final_value) || 0;
    bonusValueMoney = 0;
    bonusPercent = 0;
  }

  const condDiscountMoney = Number(evaluation.condition_discount) || 0;
  const fixedDeductions = Number(evaluation.total_deductions) || 0;
  const deductions = condDiscountMoney + fixedDeductions;

  return {
    storeName,
    customerName: evaluation.customer_name || "—",
    customerEmail: evaluation.customer_email || "—",
    customerPhone: evaluation.customer_phone || "—",
    customerAddress: buildAddressLine(lead),
    deviceLabel,
    imei: evaluation.imei || "—",
    basePrice,
    deductions,
    percentDiscount: 0, // já convertido em R$ na evaluation
    fixedDeductions,
    bonusPercent,
    bonusValue: bonusValueMoney,
    finalValue,
    flowLabel: evaluation.flow_type === "sale" ? "Venda" : "Troca",
    evaluationItems: items,
    acceptedAt: lead?.contract_accepted_at ? new Date(lead.contract_accepted_at) : new Date(evaluation.created_at),
    commercialReview: useOverride && override ? buildOverrideAddendum(override) : null,
  };
}
