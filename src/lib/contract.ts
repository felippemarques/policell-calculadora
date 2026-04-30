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
  /** Bônus convertido em R$. Quando informado e > 0, é mostrado em linha
   *  separada no laudo (em vez de só `+%`). Funciona para troca e venda. */
  bonusValue?: number;
  finalValue: number;
  flowLabel: string; // "Troca" | "Venda"
  /** Itens explícitos da avaliação (laudo). Quando informado, é renderizado no contrato. */
  evaluationItems?: EvaluationLineItem[];
  acceptedAt?: Date;
  /** Bloco extra anexado ao final do contrato (ex.: "REVISÃO COMERCIAL DA
   *  PROPOSTA" gerado pelo painel admin quando há ajuste). */
  commercialReview?: string | null;
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
  const bonusMoney = data.bonusValue ?? 0;
  const bonusPct = data.bonusPercent ?? 0;
  if (bonusMoney > 0 || bonusPct > 0) {
    const isSale = (data.flowLabel || "").toLowerCase().startsWith("venda");
    const label = isSale ? "Bônus de venda" : "Bônus de troca";
    const pctSuffix = bonusPct > 0 ? ` (${bonusPct}%)` : "";
    if (bonusMoney > 0) {
      lines.push(
        `  • ${label}${pctSuffix} ........................ + R$ ${fmtMoneyPlain(bonusMoney)}`,
      );
    } else {
      // fallback: só temos o percentual, sem R$ explícito
      lines.push(`  • ${label} aplicável ........................ +${bonusPct}%`);
    }
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
    bonus_value: fmtMoneyPlain(data.bonusValue ?? 0),
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

/**
 * Gera o PDF profissional da Proposta Comercial + Laudo + Contrato aceito.
 * Inclui cabeçalho com nome da loja, metadados (cliente / aparelho / data),
 * corpo tipografado (negritando títulos em CAIXA-ALTA) e rodapé com paginação.
 */
export function generateContractPdf(
  text: string,
  fileName = "contrato-pollicell.pdf",
  meta?: {
    storeName?: string;
    customerName?: string;
    deviceLabel?: string;
    acceptedAt?: Date;
    flowLabel?: string;
  },
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 13.5;

  const storeName = meta?.storeName || "Pollicell";
  const flowLabel = meta?.flowLabel || "Troca";
  const acceptedAt = meta?.acceptedAt ?? new Date();

  // ── Cabeçalho da primeira página ──
  const drawHeader = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(storeName.toUpperCase(), margin, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Proposta Comercial · ${flowLabel}`, margin, 50);
    doc.text(
      `Emitida em ${fmtDate(acceptedAt)}`,
      pageWidth - margin,
      50,
      { align: "right" },
    );
    doc.setTextColor(30, 30, 30);
  };

  // ── Rodapé com paginação ──
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${storeName} · Documento gerado eletronicamente`,
      margin,
      pageHeight - 20,
    );
    doc.text(
      `Página ${pageNum} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 20,
      { align: "right" },
    );
    doc.setTextColor(30, 30, 30);
  };

  drawHeader();
  let y = 100;

  // Mini metadados sob o cabeçalho
  if (meta?.customerName || meta?.deviceLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    if (meta?.customerName) {
      doc.text(`Cliente: `, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(meta.customerName, margin + 50, y);
      y += lineHeight;
    }
    if (meta?.deviceLabel) {
      doc.setFont("helvetica", "bold");
      doc.text(`Aparelho: `, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(meta.deviceLabel, margin + 55, y);
      y += lineHeight;
    }
    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);

  // Heurística simples para destacar títulos: linhas curtas em CAIXA-ALTA
  // ou que começam com numeração romana (I., II., ...) viram negrito.
  const isHeading = (line: string) => {
    const t = line.trim();
    if (!t) return false;
    if (t.length > 90) return false;
    if (/^[IVX]+\.\s/.test(t)) return true;
    if (/^[A-ZÀ-Ú0-9 ºª\-—–·\.\,\(\)\/]+$/.test(t) && t.length > 4 && /[A-ZÀ-Ú]/.test(t)) {
      // pelo menos 60% caracteres alfabéticos em maiúscula
      const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
      if (letters.length === 0) return false;
      const upper = letters.replace(/[^A-ZÀ-Ú]/g, "");
      return upper.length / letters.length >= 0.7;
    }
    return false;
  };

  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    const heading = isHeading(para);
    doc.setFont("helvetica", heading ? "bold" : "normal");
    doc.setFontSize(heading ? 11 : 10.5);
    const lines = doc.splitTextToSize(para === "" ? " " : para, usableWidth);
    for (const line of lines) {
      if (y > pageHeight - margin - 24) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    if (heading) y += 2;
  }

  // Aplica rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  doc.save(fileName);
}
