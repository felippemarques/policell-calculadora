// Contract template renderer + PDF generator (jsPDF).
// Não depende de email/edge function — gera no client e dispara download.
import { jsPDF } from "jspdf";
import { formatBRL } from "@/lib/trade-in-pricing";

export interface EvaluationLineItem {
  /** Categoria/grupo. Ex.: "Estado de conservação", "Tela", "Bateria". */
  group: string;
  /** Resposta selecionada pelo cliente. Ex.: "Riscos leves na tela". */
  answer: string;
  /** Texto formatado da dedução. Ex.: "− R$ 120,00" ou "− 10%". Vazio = sem impacto. */
  impact: string;
}

export interface ContractData {
  storeName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  deviceLabel: string;
  imei: string;
  basePrice: number;
  /** Total monetário das deduções (fixas + percentuais convertidas em R$). */
  deductions: number;
  /** Soma de % aplicada (informativo, sempre sobre basePrice). */
  percentDiscount?: number;
  /** Soma de R$ fixos aplicados (informativo). */
  fixedDeductions?: number;
  bonusPercent: number;
  finalValue: number;
  flowLabel: string; // "Troca" | "Venda"
  /** Itens explícitos da avaliação (laudo). Quando informado, é renderizado no contrato. */
  evaluationItems?: EvaluationLineItem[];
  acceptedAt?: Date;
}

const DEFAULTS = {
  store_name: "Pollicell",
  customer_name: "—",
  customer_email: "—",
  customer_phone: "—",
  customer_address: "—",
  device_label: "—",
  imei: "—",
  base_price: "0,00",
  deductions: "0,00",
  bonus_percent: "0",
  final_value: "0,00",
  flow_label: "Troca",
  flow_label_upper: "TROCA",
  flow_label_lower: "troca",
  accepted_at: "—",
  evaluation_report: "—",
};

function fmtMoneyPlain(value: number) {
  return formatBRL(value).replace("R$", "").trim();
}

function fmtDate(date: Date) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Monta o bloco textual do "LAUDO TÉCNICO DA AVALIAÇÃO" — lista explícita
 * de tudo que o cliente declarou + breakdown numérico das deduções e total.
 * Garante transparência: o cliente vê exatamente o que está aceitando.
 */
function buildEvaluationReport(data: ContractData): string {
  const lines: string[] = [];
  lines.push("LAUDO TÉCNICO DA AVALIAÇÃO");
  lines.push("");
  lines.push(`Aparelho avaliado: ${data.deviceLabel || "—"}`);
  lines.push(`IMEI declarado: ${data.imei || "—"}`);
  lines.push(`Modalidade: ${data.flowLabel || "—"}`);
  lines.push("");
  lines.push("Itens declarados pelo cliente:");
  if (data.evaluationItems && data.evaluationItems.length > 0) {
    data.evaluationItems.forEach((item, idx) => {
      const impact = item.impact ? ` — ${item.impact}` : "";
      lines.push(`  ${idx + 1}. [${item.group}] ${item.answer}${impact}`);
    });
  } else {
    lines.push("  (nenhum item adicional declarado)");
  }
  lines.push("");
  lines.push("Composição do valor:");
  lines.push(`  • Valor base de mercado .................... R$ ${fmtMoneyPlain(data.basePrice)}`);
  if ((data.percentDiscount ?? 0) > 0) {
    const pctValue =
      Math.round(data.basePrice * ((data.percentDiscount ?? 0) / 100) * 100) / 100;
    lines.push(
      `  • Desconto percentual (${data.percentDiscount}% sobre o valor base) ... − R$ ${fmtMoneyPlain(pctValue)}`,
    );
  }
  if ((data.fixedDeductions ?? 0) > 0) {
    lines.push(
      `  • Deduções fixas por defeitos declarados ... − R$ ${fmtMoneyPlain(data.fixedDeductions ?? 0)}`,
    );
  }
  if (
    (data.bonusPercent ?? 0) > 0 &&
    (data.flowLabel || "").toLowerCase().startsWith("troca")
  ) {
    lines.push(`  • Bônus de upgrade aplicável na troca ...... +${data.bonusPercent}%`);
  }
  lines.push(`  ─────────────────────────────────────────────`);
  lines.push(
    `  • VALOR FINAL DA PROPOSTA .................. R$ ${fmtMoneyPlain(data.finalValue)}`,
  );
  lines.push("");
  lines.push(
    "Importante: percentuais são sempre calculados sobre o valor base de mercado (cálculo linear, sem cascata). A ordem das respostas não altera o resultado.",
  );
  return lines.join("\n");
}

/** Aplica os tokens {{...}} no template e injeta o laudo técnico. */
export function renderContractText(template: string, data: ContractData): string {
  const flowLabel = data.flowLabel || DEFAULTS.flow_label;
  const report = buildEvaluationReport(data);
  const map: Record<string, string> = {
    ...DEFAULTS,
    store_name: data.storeName || DEFAULTS.store_name,
    customer_name: data.customerName || DEFAULTS.customer_name,
    customer_email: data.customerEmail || DEFAULTS.customer_email,
    customer_phone: data.customerPhone || DEFAULTS.customer_phone,
    customer_address: data.customerAddress || DEFAULTS.customer_address,
    device_label: data.deviceLabel || DEFAULTS.device_label,
    imei: data.imei || DEFAULTS.imei,
    base_price: fmtMoneyPlain(data.basePrice),
    deductions: fmtMoneyPlain(data.deductions),
    bonus_percent: String(data.bonusPercent ?? 0),
    final_value: fmtMoneyPlain(data.finalValue),
    flow_label: flowLabel,
    flow_label_upper: flowLabel.toUpperCase(),
    flow_label_lower: flowLabel.toLowerCase(),
    accepted_at: fmtDate(data.acceptedAt ?? new Date()),
    evaluation_report: report,
  };

  let rendered = template.replace(
    /\{\{\s*([a-z_]+)\s*\}\}/gi,
    (_m, key) => map[key] ?? `{{${key}}}`,
  );

  // Se o template do admin não referencia {{evaluation_report}}, anexamos o
  // laudo automaticamente ao final — garantia de transparência mesmo se o
  // operador esquecer o token.
  if (
    !/\{\{\s*evaluation_report\s*\}\}/i.test(template) &&
    !rendered.includes("LAUDO TÉCNICO DA AVALIAÇÃO")
  ) {
    rendered = `${rendered.trimEnd()}\n\n----------------------------------------\n\n${report}\n`;
  }

  return rendered;
}

/** Gera o PDF do contrato e dispara download no browser. */
export function generateContractPdf(text: string, fileName = "contrato-pollicell.pdf") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Contrato de Avaliação / Troca", margin, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const paragraphs = text.split("\n");
  let y = margin + 28;
  const lineHeight = 14;

  for (const para of paragraphs) {
    const lines = doc.splitTextToSize(para === "" ? " " : para, usableWidth);
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  doc.save(fileName);
}
