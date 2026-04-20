// Contract template renderer + PDF generator (jsPDF).
// Não depende de email/edge function — gera no client e dispara download.
import { jsPDF } from "jspdf";
import { formatBRL } from "@/lib/trade-in-pricing";

export interface ContractData {
  storeName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  deviceLabel: string;
  imei: string;
  basePrice: number;
  deductions: number;
  bonusPercent: number;
  finalValue: number;
  flowLabel: string; // "Troca" | "Venda"
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
  accepted_at: "—",
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

/** Aplica os tokens {{...}} no template. */
export function renderContractText(template: string, data: ContractData): string {
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
    flow_label: data.flowLabel || DEFAULTS.flow_label,
    accepted_at: fmtDate(data.acceptedAt ?? new Date()),
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key) => map[key] ?? `{{${key}}}`);
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
